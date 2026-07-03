import 'dotenv/config';
import {
  getCloudflareConfig,
  isCloudflareCdnConfigured,
} from '../packages/cloudflare/src/custom-hostnames';

async function verifyCloudflareCdn() {
  console.log('Verifying Cloudflare Custom Hostnames (SSL for SaaS)...\n');

  if (!isCloudflareCdnConfigured()) {
    console.error('  ERROR: Missing env vars.');
    console.error('  Required: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID');
    console.error('  Optional: CLOUDFLARE_CNAME_TARGET, CLOUDFLARE_SAAS_FALLBACK');
    process.exit(1);
  }

  const config = getCloudflareConfig()!;
  console.log(`  Zone ID: ${config.zoneId}`);
  console.log(`  Customer CNAME target: ${config.cnameTarget}`);
  console.log(`  Worker SaaS fallback origin: ${config.saasFallbackOrigin}`);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/custom_hostnames?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const body = (await res.json()) as {
    success: boolean;
    errors?: Array<{ message: string }>;
    result_info?: { total_count?: number };
  };

  if (!res.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join('; ') ?? `HTTP ${res.status}`;
    console.error(`  ERROR: ${message}`);
    console.error('\n  Check token permissions: Zone > SSL and Certificates > Edit');
    process.exit(1);
  }

  const fallbackRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/custom_hostnames/fallback_origin`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  const fallbackBody = (await fallbackRes.json()) as {
    success: boolean;
    result?: { origin: string; status: string };
  };

  console.log(`  API: OK (${body.result_info?.total_count ?? 0} custom hostname(s) in zone)`);
  if (fallbackBody.success && fallbackBody.result) {
    console.log(`  Fallback origin: ${fallbackBody.result.origin} [${fallbackBody.result.status}]`);
    if (fallbackBody.result.origin !== config.saasFallbackOrigin) {
      console.warn(`  ⚠ Expected fallback origin ${config.saasFallbackOrigin}`);
      console.warn('    Run: pnpm setup-cloudflare-saas');
    }
  }

  console.log('\nCloudflare CDN verification passed!');
  console.log('\nMANUAL STEPS (one-time in Cloudflare Dashboard):');
  console.log('  1. SSL/TLS → Custom Hostnames → Enable SSL for SaaS');
  console.log(`  2. Fallback Origin → ${config.saasFallbackOrigin} (originless AAAA + Worker */*)`);
  console.log(`  3. Customer CNAME target → ${config.cnameTarget}`);
  console.log('  4. Deploy transform-worker: pnpm --filter @uploadkitdev/transform-worker run deploy');

  process.exit(0);
}

verifyCloudflareCdn().catch((err) => {
  console.error('Cloudflare CDN verification failed:', err);
  process.exit(1);
});
