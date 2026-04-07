import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '../apps/api/src/lib/storage';

async function verifyR2() {
  console.log('Verifying R2 connection...');
  console.log(`  Bucket: ${R2_BUCKET}`);
  console.log(`  Endpoint: https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);

  try {
    const result = await r2Client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    console.log('  Status: Connected successfully');
    console.log(`  HTTP Status: ${result.$metadata.httpStatusCode}`);
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NotFound') {
      console.error(`  ERROR: Bucket '${R2_BUCKET}' does not exist. Create it in Cloudflare dashboard.`);
    } else if (err.name === 'CredentialsProviderError' || err.message?.includes('credentials')) {
      console.error('  ERROR: R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env');
    } else {
      console.error(`  ERROR: ${err.message}`);
    }
    process.exit(1);
  }

  console.log('\nR2 verification passed!');
  console.log('\nREMINDER: Configure CORS on the bucket with these settings:');
  console.log(JSON.stringify([{
    AllowedOrigins: ['https://uploadkit.dev', 'https://app.uploadkit.dev', 'http://localhost:3000'],
    AllowedMethods: ['PUT'],
    AllowedHeaders: ['Content-Type', 'Content-Length'],
    MaxAgeSeconds: 3600,
  }], null, 2));

  console.log('\nMANUAL STEPS REQUIRED (see PLAN 01-03 user_setup for full instructions):');
  console.log('  1. Add lifecycle rule in Cloudflare Dashboard -> R2 -> uploadkit-prod -> Lifecycle rules');
  console.log('     Rule: delete objects older than 1 day with UPLOADING status (orphaned presigned uploads)');
  console.log('  2. Connect CDN domain: Cloudflare Dashboard -> R2 -> uploadkit-prod -> Settings -> Custom Domains');
  console.log('     Domain: cdn.uploadkit.dev');

  process.exit(0);
}

verifyR2().catch((err) => {
  console.error('R2 verification failed:', err);
  process.exit(1);
});
