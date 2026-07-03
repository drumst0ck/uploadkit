/**
 * One-time Cloudflare SSL for SaaS setup for UploadKit custom CDN domains.
 *
 * Architecture:
 * - saas.uploadkit.dev  → originless AAAA (100::) proxied, Worker fallback origin
 * - cname.uploadkit.dev → proxied CNAME → saas.uploadkit.dev (customer CNAME target)
 * - cdn.uploadkit.dev   → R2 custom domain (managed CDN default, unchanged)
 *
 * Deploy the transform-worker (`pnpm --filter @uploadkitdev/transform-worker run deploy`)
 * before or after running this script — the Worker wildcard route serves custom hostnames.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
const ZONE_NAME = 'uploadkit.dev';
const SAAS_FALLBACK_ORIGIN = 'saas.uploadkit.dev';
const CNAME_TARGET = 'cname.uploadkit.dev';
const MANAGED_CDN = 'cdn.uploadkit.dev';

interface CfResponse<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result: T;
  result_info?: { total_count?: number };
}

interface Zone {
  id: string;
  name: string;
  status: string;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

interface FallbackOrigin {
  origin: string;
  status: string;
  errors?: Array<{ message: string }>;
}

function resolveApiToken(requireEnv = false): string {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (requireEnv) {
    throw new Error('CLOUDFLARE_API_TOKEN is required in .env for Custom Hostnames API.');
  }

  try {
    const token = execSync('pnpm dlx wrangler auth token 2>/dev/null | tail -1', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (token) return token;
  } catch {
    // wrangler not authenticated
  }

  throw new Error(
    'No Cloudflare credentials. Set CLOUDFLARE_API_TOKEN in .env or run `pnpm dlx wrangler login`.',
  );
}

async function cf<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<CfResponse<T>> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return (await res.json()) as CfResponse<T>;
}

function fail(message: string, errors?: Array<{ message: string }>): never {
  const detail = errors?.map((e) => e.message).join('; ');
  console.error(`\n✗ ${message}${detail ? `: ${detail}` : ''}`);
  process.exit(1);
}

function upsertEnvVar(key: string, value: string): void {
  let content = '';
  try {
    content = readFileSync(ENV_PATH, 'utf8');
  } catch {
    content = '';
  }

  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
    content += `\n# Cloudflare Custom Hostnames (SSL for SaaS)\n${line}\n`;
  }

  writeFileSync(ENV_PATH, content, 'utf8');
  console.log(`  → Updated .env: ${key}`);
}

async function findDnsRecord(
  token: string,
  zoneId: string,
  fqdn: string,
  type?: string,
): Promise<DnsRecord | undefined> {
  const typeQuery = type ? `&type=${type}` : '';
  const dns = await cf<DnsRecord[]>(
    token,
    `/zones/${zoneId}/dns_records?name=${fqdn}&per_page=5${typeQuery}`,
  );
  if (!dns.success) return undefined;
  return dns.result.find((r) => r.name === fqdn || r.name === `${fqdn}.`);
}

async function upsertDnsRecord(
  token: string,
  zoneId: string,
  record: { type: 'AAAA' | 'CNAME'; name: string; content: string; proxied: boolean },
): Promise<void> {
  const fqdn = `${record.name}.${ZONE_NAME}`;
  const existing = await findDnsRecord(token, zoneId, fqdn, record.type);
  const body = {
    type: record.type,
    name: record.name,
    content: record.content,
    proxied: record.proxied,
    ttl: 1,
  };

  if (existing) {
    const updated = await cf<DnsRecord>(token, `/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!updated.success) {
      fail(`Failed to update DNS ${fqdn}`, updated.errors);
    }
    console.log(`   Updated ${record.type} ${fqdn} → ${record.content} (proxied: ${record.proxied})`);
    return;
  }

  const created = await cf<DnsRecord>(token, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!created.success) {
    fail(`Failed to create DNS ${fqdn}`, created.errors);
  }
  console.log(`   Created ${record.type} ${fqdn} → ${record.content} (proxied: ${record.proxied})`);
}

async function main() {
  console.log('UploadKit — Cloudflare SSL for SaaS setup\n');

  const lookupToken = resolveApiToken();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? lookupToken;
  const saasFallback =
    process.env.CLOUDFLARE_SAAS_FALLBACK?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? SAAS_FALLBACK_ORIGIN;
  const cnameTarget =
    process.env.CLOUDFLARE_CNAME_TARGET?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? process.env.CLOUDFLARE_CDN_FALLBACK?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? CNAME_TARGET;

  let zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();

  if (!zoneId) {
    console.log(`1. Resolving zone ID for ${ZONE_NAME}...`);
    const zones = await cf<Zone[]>(lookupToken, `/zones?name=${ZONE_NAME}`);
    if (!zones.success || !zones.result[0]) {
      fail(`Zone ${ZONE_NAME} not found`, zones.errors);
    }
    zoneId = zones.result[0]!.id;
    console.log(`   Zone ID: ${zoneId} (${zones.result[0]!.status})`);
    upsertEnvVar('CLOUDFLARE_ZONE_ID', zoneId);
  } else {
    console.log(`1. Using CLOUDFLARE_ZONE_ID from .env (${zoneId})`);
  }

  console.log(`\n2. Checking managed CDN ${MANAGED_CDN} (R2 custom domain)...`);
  const cdnRecord = await findDnsRecord(apiToken, zoneId, MANAGED_CDN);
  if (!cdnRecord) {
    console.warn(`   ⚠ No DNS record for ${MANAGED_CDN}.`);
    console.warn('     Add via R2 → bucket → Settings → Custom Domains.');
  } else {
    console.log(`   Found ${cdnRecord.type} ${cdnRecord.name} → ${cdnRecord.content}`);
    console.log(`   Proxied: ${cdnRecord.proxied ? 'yes ✓' : 'no'}`);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    console.log('\n3. SaaS DNS + fallback — skipped (need CLOUDFLARE_API_TOKEN in .env)');
    console.log('   Manual steps:');
    console.log(`   - AAAA ${saasFallback} → 100:: (proxied) — Worker fallback origin`);
    console.log(`   - CNAME ${cnameTarget} → ${saasFallback} (proxied) — customer CNAME target`);
    console.log(`   - Fallback Origin in Custom Hostnames → ${saasFallback}`);
    console.log('   - Deploy transform-worker with route */* on uploadkit.dev');
  } else {
    console.log(`\n3. Creating SaaS Worker fallback DNS (${saasFallback})...`);
    await upsertDnsRecord(apiToken, zoneId, {
      type: 'AAAA',
      name: 'saas',
      content: '100::',
      proxied: true,
    });

    console.log(`\n4. Creating customer CNAME target (${cnameTarget})...`);
    const cnameLabel = cnameTarget.replace(`.${ZONE_NAME}`, '');
    await upsertDnsRecord(apiToken, zoneId, {
      type: 'CNAME',
      name: cnameLabel,
      content: saasFallback,
      proxied: true,
    });

    console.log(`\n5. Configuring fallback origin → ${saasFallback}...`);
    const current = await cf<FallbackOrigin>(apiToken, `/zones/${zoneId}/custom_hostnames/fallback_origin`);
    if (!current.success) {
      console.warn('   Could not read current fallback origin (SaaS may not be enabled yet).');
      if (current.errors?.length) {
        for (const err of current.errors) console.warn(`   - ${err.message}`);
      }
    } else if (current.result.origin === saasFallback && current.result.status === 'active') {
      console.log(`   Already active: ${current.result.origin}`);
    } else {
      console.log(`   Current: ${current.result.origin || '(none)'} [${current.result.status}]`);
      const updated = await cf<FallbackOrigin>(apiToken, `/zones/${zoneId}/custom_hostnames/fallback_origin`, {
        method: 'PUT',
        body: JSON.stringify({ origin: saasFallback }),
      });
      if (!updated.success) {
        fail('Failed to set fallback origin. Enable SSL for SaaS in dashboard first', updated.errors);
      }
      console.log(`   Set fallback origin: ${updated.result.origin} [${updated.result.status}]`);
    }

    console.log('\n6. Verifying Custom Hostnames API access...');
    const hostnames = await cf<unknown[]>(apiToken, `/zones/${zoneId}/custom_hostnames?per_page=1`);
    if (!hostnames.success) {
      fail('Custom Hostnames API not accessible', hostnames.errors);
    }
    console.log(`   API OK (${hostnames.result_info?.total_count ?? 0} hostname(s) registered)`);
  }

  if (!process.env.CLOUDFLARE_CNAME_TARGET) {
    upsertEnvVar('CLOUDFLARE_CNAME_TARGET', cnameTarget);
  }
  if (!process.env.CLOUDFLARE_SAAS_FALLBACK) {
    upsertEnvVar('CLOUDFLARE_SAAS_FALLBACK', saasFallback);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    console.log('\n7. API token for Custom Hostnames + DNS API');
    console.log('   Permissions: Zone > SSL and Certificates > Edit, Zone > DNS > Edit');
    console.log('   Zone Resources: uploadkit.dev only');
    console.log('\n   Re-run: pnpm setup-cloudflare-saas');
  } else {
    console.log('\n7. CLOUDFLARE_API_TOKEN already set in .env ✓');
  }

  console.log('\n✓ Cloudflare SSL for SaaS setup complete.');
  console.log('\nDeploy Worker (required for custom hostnames):');
  console.log('  pnpm --filter @uploadkitdev/transform-worker run deploy');
  console.log('\nCustomer DNS:');
  console.log(`  External DNS:  CNAME cdn.cliente.com → ${cnameTarget} (DNS only / gray cloud)`);
  console.log(`  On Cloudflare: CNAME cdn.cliente.com → ${cnameTarget} (proxied / orange — O2O)`);
  console.log('\nNote: Image transforms (/t/, /p/) always use cdn.uploadkit.dev.');
  console.log('\nVerify: pnpm verify-cloudflare-cdn');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
