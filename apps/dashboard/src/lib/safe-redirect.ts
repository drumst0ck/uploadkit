/**
 * Auth.js `redirect` callback target: same-origin only. Compares parsed origins
 * (a plain `startsWith(baseUrl)` also accepts `https://app.example.com.evil.com`).
 */
export function resolveAuthRedirect(url: string, baseUrl: string): string {
  const fallback = `${baseUrl}/dashboard`;
  if (url.startsWith('/')) {
    if (url.startsWith('//') || url.startsWith('/\\')) return fallback;
    return `${baseUrl}${url}`;
  }
  try {
    const target = new URL(url);
    if (target.origin === new URL(baseUrl).origin) return target.toString();
  } catch {
    // unparseable → fallback
  }
  return fallback;
}

const INVITE_CALLBACK = /^\/dashboard\/team\/accept\?token=[A-Za-z0-9_-]{20,100}$/;

/** Whitelist for the only `callbackUrl` the login page honours: the team invite accept page. */
export function parseInviteCallback(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let candidate = value;
  // The Auth.js proxy sets callbackUrl as an absolute URL; only its path+query is kept.
  if (/^https?:\/\//.test(value)) {
    try {
      const u = new URL(value);
      candidate = `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }
  return INVITE_CALLBACK.test(candidate) ? candidate : null;
}
