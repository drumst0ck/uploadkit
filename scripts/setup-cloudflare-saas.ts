/**
 * One-time Cloudflare SSL for SaaS setup for UploadKit custom CDN domains.
 *
 * Uses CLOUDFLARE_API_TOKEN from .env, or falls back to local Wrangler OAuth.
 * Writes CLOUDFLARE_ZONE_ID + CLOUDFLARE_CDN_FALLBACK to .env when missing.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
const ZONE_NAME = 'uploadkit.dev';
const FALLBACK_ORIGIN = 'cdn.uploadkit.dev';

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

async function main() {
  console.log('UploadKit — Cloudflare SSL for SaaS setup\n');

  const lookupToken = resolveApiToken();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? lookupToken;
  const fallback = process.env.CLOUDFLARE_CDN_FALLBACK?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? process.env.CDN_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? FALLBACK_ORIGIN;

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

  console.log(`\n2. Checking DNS for ${fallback}...`);
  const dns = await cf<DnsRecord[]>(
    apiToken,
    `/zones/${zoneId}/dns_records?name=${fallback}&per_page=5`,
  );
  if (!dns.success) {
    console.warn(`   ⚠ DNS lookup skipped (${dns.errors?.map((e) => e.message).join('; ') ?? 'no permission'})`);
    console.warn('     Ensure cdn.uploadkit.dev exists and is proxied (R2 Custom Domain or orange-cloud CNAME).');
  } else {
    const cdnRecord = dns.result.find((r) => r.name === fallback || r.name === `${fallback}.`);
    if (!cdnRecord) {
      console.warn(`   ⚠ No DNS record for ${fallback}.`);
      console.warn('     Add it via R2 → bucket → Settings → Custom Domains, or create a proxied record.');
    } else {
      console.log(`   Found ${cdnRecord.type} ${cdnRecord.name} → ${cdnRecord.content}`);
      console.log(`   Proxied: ${cdnRecord.proxied ? 'yes ✓' : 'no — must be proxied (orange cloud)'}`);
      if (!cdnRecord.proxied) {
        console.warn('   ⚠ Enable proxy on this record for SSL for SaaS to work.');
      }
    }
  }

  if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    console.log('\n3. Fallback origin — skipped (need CLOUDFLARE_API_TOKEN in .env)');
    console.log('   Set fallback manually: https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls/custom-hostnames');
    console.log(`   Fallback Origin → ${fallback}`);
  } else {
    console.log(`\n3. Configuring fallback origin → ${fallback}...`);
    const current = await cf<FallbackOrigin>(apiToken, `/zones/${zoneId}/custom_hostnames/fallback_origin`);
    if (!current.success) {
      console.warn('   Could not read current fallback origin (SaaS may not be enabled yet).');
      if (current.errors?.length) {
        for (const err of current.errors) console.warn(`   - ${err.message}`);
      }
    } else if (current.result.origin === fallback && current.result.status === 'active') {
      console.log(`   Already active: ${current.result.origin}`);
    } else {
      console.log(`   Current: ${current.result.origin || '(none)'} [${current.result.status}]`);
      const updated = await cf<FallbackOrigin>(apiToken, `/zones/${zoneId}/custom_hostnames/fallback_origin`, {
        method: 'PUT',
        body: JSON.stringify({ origin: fallback }),
      });
      if (!updated.success) {
        fail('Failed to set fallback origin. Enable SSL for SaaS in dashboard first', updated.errors);
      }
      console.log(`   Set fallback origin: ${updated.result.origin} [${updated.result.status}]`);
    }

    console.log('\n4. Verifying Custom Hostnames API access...');
    const hostnames = await cf<unknown[]>(apiToken, `/zones/${zoneId}/custom_hostnames?per_page=1`);
    if (!hostnames.success) {
      fail('Custom Hostnames API not accessible', hostnames.errors);
    }
    console.log(`   API OK (${hostnames.result_info?.total_count ?? 0} hostname(s) registered)`);
  }

  if (!process.env.CLOUDFLARE_CDN_FALLBACK) {
    upsertEnvVar('CLOUDFLARE_CDN_FALLBACK', fallback);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    console.log('\n5. API token for Custom Hostnames API');
    console.log('   Wrangler OAuth cannot call Custom Hostnames — create a dedicated token:');
    console.log('   1. https://dash.cloudflare.com/profile/api-tokens');
    console.log('   2. Create Token → Custom token');
    console.log('   3. Permissions:');
    console.log('        Zone | SSL and Certificates | Edit');
    console.log('        Zone | Zone | Read');
    console.log('   4. Zone Resources: uploadkit.dev only');
    console.log('   5. Copy token → CLOUDFLARE_API_TOKEN in .env + Vercel (dashboard + api)');
    console.log('\n   Then enable SaaS + fallback origin (one-time):');
    console.log(`   https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls/custom-hostnames`);
    console.log('   (select zone uploadkit.dev if prompted)');
    console.log('   → Enable SSL for SaaS (if prompted)');
    console.log(`   → Fallback Origin: ${fallback}`);
    console.log('\n   Re-run: pnpm setup-cloudflare-saas');
  } else {
    console.log('\n5. CLOUDFLARE_API_TOKEN already set in .env ✓');
  }

  console.log('\n✓ Cloudflare SSL for SaaS setup complete.');
  console.log('\nCustomer flow:');
  console.log(`  CNAME cdn.cliente.com → ${fallback}`);
  console.log('  Dashboard registers hostname via API → TXT validation → active');
  console.log('\nNote: Image transforms (/t/, /p/) always use cdn.uploadkit.dev.');
  console.log('\nVerify: pnpm verify-cloudflare-cdn');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
