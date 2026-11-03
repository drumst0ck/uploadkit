import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { RateLimitError } from '@uploadkitdev/shared';
import { createLimiter } from '@/lib/limiter';

const attempts = createLimiter(300, 'uploadkit:auth-ip');
const failures = createLimiter(30, 'uploadkit:auth-failures');

function sourceKey(req: { headers: Headers }): string {
  // Never trust arbitrary client-supplied forwarding headers. Operators may set
  // this ONLY to a header overwritten by their trusted ingress (not appended).
  // Without that guarantee, use a shared bucket rather than permit bypasses.
  const header = process.env.API_TRUSTED_IP_HEADER;
  const value = header ? req.headers.get(header)?.trim() : undefined;
  const source = value && isIP(value) ? value : 'unknown';
  return createHash('sha256').update(source).digest('hex');
}

export async function checkAuthenticationRate(req: { headers: Headers }): Promise<void> {
  const key = sourceKey(req);
  for (const result of [await attempts.limit(key), await failures.check(key)]) {
    if (!result.success) throw new RateLimitError(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
  }
}

export async function recordAuthenticationFailure(req: { headers: Headers }): Promise<void> {
  await failures.limit(sourceKey(req));
}
