import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { RateLimitError } from '@uploadkitdev/shared';
import { createLimiter } from '@/lib/limiter';

const attempts = createLimiter(300, 'uploadkit:auth-ip');
const failures = createLimiter(30, 'uploadkit:auth-failures');

let warnedNoTrustedIp = false;

/** Returns a hashed client IP from the operator-trusted header, or null. */
function sourceKey(req: { headers: Headers }): string | null {
  // Never trust arbitrary client-supplied forwarding headers. Operators may set
  // this ONLY to a header overwritten by their trusted ingress (not appended).
  // Without a trusted IP the per-IP limits are skipped: sharing one bucket would
  // let 30 failures lock out every customer. Per-key limits still apply.
  const header = process.env.API_TRUSTED_IP_HEADER;
  const value = header ? req.headers.get(header)?.trim() : undefined;
  if (value && isIP(value)) return createHash('sha256').update(value).digest('hex');
  if (!warnedNoTrustedIp) {
    warnedNoTrustedIp = true;
    console.warn('[auth-rate-limit] No trusted client IP (set API_TRUSTED_IP_HEADER); per-IP authentication limits are disabled.');
  }
  return null;
}

export async function checkAuthenticationRate(req: { headers: Headers }): Promise<void> {
  const key = sourceKey(req);
  if (!key) return;
  for (const result of [await attempts.limit(key), await failures.check(key)]) {
    if (!result.success) throw new RateLimitError(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
  }
}

export async function recordAuthenticationFailure(req: { headers: Headers }): Promise<void> {
  const key = sourceKey(req);
  if (key) await failures.limit(key);
}
