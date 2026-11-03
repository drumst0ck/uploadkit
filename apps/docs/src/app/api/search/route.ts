import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { createRateLimiter } from '@/lib/rate-limit';

const search = createFromSource(source, { language: 'english' });

// 60 searches per minute per client. Traefik sets x-real-ip (docs is not behind
// Cloudflare); without that header there is no trustworthy key, so we do not limit.
const limiter = createRateLimiter({ max: 60, windowMs: 60_000 });

export async function GET(request: Request): Promise<Response> {
  const ip = request.headers.get('x-real-ip')?.trim() || null;
  if (!limiter.check(ip)) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds(ip!)) } },
    );
  }
  return search.GET(request);
}
