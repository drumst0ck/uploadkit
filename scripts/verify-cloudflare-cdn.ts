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
    console.error('  Optional: CLOUDFLARE_CDN_FALLBACK (defaults to CDN_URL hostname)');
    process.exit(1);
  }

  const config = getCloudflareConfig()!;
  console.log(`  Zone ID: ${config.zoneId}`);
  console.log(`  Fallback origin (customer CNAME target): ${config.fallbackOrigin}`);

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

  console.log(`  API: OK (${body.result_info?.total_count ?? 0} custom hostname(s) in zone)`);
  console.log('\nCloudflare CDN verification passed!');
  console.log('\nMANUAL STEPS (one-time in Cloudflare Dashboard):');
  console.log('  1. SSL/TLS → Custom Hostnames → Enable SSL for SaaS');
  console.log(`  2. Set Fallback Origin to: ${config.fallbackOrigin}`);
  console.log('  3. Ensure cdn.uploadkit.dev routes to your R2 bucket (public access / worker)');

  process.exit(0);
}

verifyCloudflareCdn().catch((err) => {
  console.error('Cloudflare CDN verification failed:', err);
  process.exit(1);
});
