// Validate required env vars at runtime only — skip during Next.js build
const required = [
  'MONGODB_URI',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

if (process.env.NODE_ENV !== 'production' || typeof globalThis.__NEXT_DATA__ === 'undefined') {
  // Only validate when actually serving requests, not during static generation
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`[env] Missing required environment variable: ${key}`);
      }
    }
  }
}
