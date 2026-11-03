import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { UploadKitError } from '@uploadkitdev/shared';

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true });
    redisClient.on('error', (err: Error) => console.error('[redis] Connection error:', err.message));
  }
  return redisClient;
}

/** Shared Redis limiter with a bounded, process-local outage fallback.
 * Production REQUIRES REDIS_URL: silently using per-process memory would multiply
 * every limit by the replica count and reset it on each deploy, so it fails closed
 * (503) instead. The check runs on first use rather than at import so `next build`
 * (NODE_ENV=production, no runtime secrets) keeps working. Dev/test use memory.
 */
export function createLimiter(points: number, prefix: string) {
  type Backend = {
    redis: Redis | null;
    memoryFallback: RateLimiterMemory;
    limiter: RateLimiterRedis | RateLimiterMemory;
  };
  let backend: Backend | undefined;

  function init(): Backend {
    if (backend) return backend;
    const redis = getRedis();
    if (!redis && process.env.NODE_ENV === 'production') {
      throw new UploadKitError(
        'RATE_LIMITER_NOT_CONFIGURED',
        'REDIS_URL is required in production for rate limiting; refusing to fall back to in-memory limits.',
        503,
      );
    }
    backend = {
      redis,
      memoryFallback: new RateLimiterMemory({ points, duration: 60, keyPrefix: `${prefix}:fallback` }),
      limiter: redis
        ? new RateLimiterRedis({ storeClient: redis, points, duration: 60, keyPrefix: prefix })
        : new RateLimiterMemory({ points, duration: 60, keyPrefix: prefix }),
    };
    return backend;
  }

  async function consume(key: string, { redis, memoryFallback, limiter }: Backend) {
    try {
      return await limiter.consume(key);
    } catch (error) {
      if (error instanceof Error && redis) {
        console.error('[ratelimit] Redis unavailable, using memory fallback:', error.message);
        return memoryFallback.consume(key);
      }
      throw error;
    }
  }

  return {
    async limit(key: string): Promise<{ success: boolean; reset: number }> {
      const resolved = init(); // configuration errors must surface, not read as "limited"
      try {
        const result = await consume(key, resolved);
        return { success: true, reset: Date.now() + (result.msBeforeNext ?? 0) };
      } catch (error) {
        const result = error as { msBeforeNext?: number };
        return { success: false, reset: Date.now() + (result.msBeforeNext ?? 60_000) };
      }
    },
    /** Check an authentication failure bucket without penalizing valid requests. */
    async check(key: string): Promise<{ success: boolean; reset: number }> {
      const { redis, memoryFallback, limiter } = init();
      let result;
      try {
        result = await limiter.get(key);
      } catch (error) {
        if (!redis) throw error;
        result = await memoryFallback.get(key);
      }
      // Also respect failures recorded during a Redis outage after Redis recovers.
      const fallback = redis ? await memoryFallback.get(key) : null;
      const exhausted = [result, fallback].find((entry) => entry && entry.consumedPoints >= points);
      return { success: !exhausted, reset: Date.now() + (exhausted?.msBeforeNext ?? 0) };
    },
  };
}
