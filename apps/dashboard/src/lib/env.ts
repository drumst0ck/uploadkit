const required = [
  'MONGODB_URI',
  'AUTH_SECRET',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}
