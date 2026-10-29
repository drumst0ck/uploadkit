import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Constant-time string comparison. Both inputs are hashed first so that
 * timingSafeEqual always compares equal-length buffers (no length leak).
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Cron authorization: CRON_SECRET must be configured and be presented via
 * `x-cron-secret` or `Authorization: Bearer <secret>`.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.*)$/i)?.[1] ?? null;
  const viaHeader = safeEqual(req.headers.get('x-cron-secret'), cronSecret);
  const viaBearer = safeEqual(bearer, cronSecret);
  return viaHeader || viaBearer;
}

/**
 * Guard for internal (server-to-server) routes protected by INTERNAL_API_SECRET.
 * Fails closed: returns a 503 response when the secret is not configured,
 * 401 on mismatch, and null when the caller is authorized.
 */
export function requireInternalSecret(req: NextRequest): NextResponse | null {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    console.error('[internal-auth] INTERNAL_API_SECRET is not configured — refusing request');
    return NextResponse.json(
      { error: { type: 'api_error', code: 'SERVICE_UNAVAILABLE', message: 'Internal API is not configured' } },
      { status: 503 },
    );
  }
  if (!safeEqual(req.headers.get('x-internal-secret'), internalSecret)) {
    return NextResponse.json(
      { error: { type: 'authentication_error', code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }
  return null;
}
