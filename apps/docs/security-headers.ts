// Security headers for docs.uploadkit.dev (no third-party scripts). CSP keeps 'unsafe-inline' for scripts because
// Next.js and the fumadocs theme provider emit inline scripts; a nonce would force
// every page dynamic. Sandbox previews are mocked, so no external connect hosts.
export function buildCsp(isDev = false): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://api.uploadkit.dev'],
    'frame-src': ["'none'"],
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
