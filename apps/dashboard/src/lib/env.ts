const required = [
  'MONGODB_URI',
  'AUTH_SECRET',
] as const;

if (process.env.NEXT_PHASE !== 'phase-production-build') {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[env] Missing required environment variable: ${key}`);
    }
  }
}
