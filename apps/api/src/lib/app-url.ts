/**
 * Public dashboard origin used for Stripe success/return URLs.
 * Fails loudly in production instead of silently pointing users at localhost.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must be configured in production');
  }
  return 'http://localhost:3001';
}
