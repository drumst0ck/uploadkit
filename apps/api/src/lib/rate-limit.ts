import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Keyed by API key ID (not IP) per PITFALLS.md integration gotchas
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'uploadkit:ratelimit',
});

// Higher limit for presigned URL generation (upload flow)
export const uploadRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'uploadkit:upload-ratelimit',
});
