// Security headers for uploadkit.dev. CSP keeps 'unsafe-inline' for scripts because
// Next.js emits inline bootstrap/JSON-LD scripts and the layout injects the consent
// default + theme scripts; a nonce would force every page dynamic. Third-party script
// hosts are limited to Google Tag Manager/Analytics and X (Twitter) ads, loaded through
// GTM only after analytics consent.
const GOOGLE_HOSTS = [
  'https://www.googletagmanager.com',
  'https://*.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.doubleclick.net',
];
const X_HOSTS = ['https://static.ads-twitter.com', 'https://analytics.twitter.com', 'https://t.co'];

export function buildCsp(isDev = false): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...GOOGLE_HOSTS, ...X_HOSTS],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://api.uploadkit.dev', ...GOOGLE_HOSTS, ...X_HOSTS],
    'frame-src': ['https://www.googletagmanager.com'],
    'media-src': ["'self'", 'https:', 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const body = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`);
  return [...body, ...(isDev ? [] : ['upgrade-insecure-requests'])].join('; ');
}

export function securityHeaders(isDev = false): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(isDev) },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
