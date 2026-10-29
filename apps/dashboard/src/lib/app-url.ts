/**
 * Public dashboard origin for Stripe success/return URLs.
 * Throws in production when unset instead of sending users to localhost.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL (or AUTH_URL) must be configured in production');
  }
  return 'http://localhost:3001';
}
