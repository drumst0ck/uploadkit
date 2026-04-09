// Validated at import time — server will not start with missing required vars
const required = [
  'MONGODB_URI',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}
