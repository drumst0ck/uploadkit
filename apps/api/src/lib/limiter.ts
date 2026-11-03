import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true });
    redisClient.on('error', (err: Error) => console.error('[redis] Connection error:', err.message));
  }
  return redisClient;
}

/** Shared Redis limiter with a bounded, process-local outage fallback. */
export function createLimiter(points: number, prefix: string) {
  const redis = getRedis();
  const memoryFallback = new RateLimiterMemory({ points, duration: 60, keyPrefix: `${prefix}:fallback` });
  const limiter = redis
    ? new RateLimiterRedis({ storeClient: redis, points, duration: 60, keyPrefix: prefix })
    : new RateLimiterMemory({ points, duration: 60, keyPrefix: prefix });

  async function consume(key: string) {
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
      try {
        const result = await consume(key);
        return { success: true, reset: Date.now() + (result.msBeforeNext ?? 0) };
      } catch (error) {
        const result = error as { msBeforeNext?: number };
        return { success: false, reset: Date.now() + (result.msBeforeNext ?? 60_000) };
      }
    },
    /** Check an authentication failure bucket without penalizing valid requests. */
    async check(key: string): Promise<{ success: boolean; reset: number }> {
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
