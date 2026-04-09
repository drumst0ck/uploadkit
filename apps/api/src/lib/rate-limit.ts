import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on('error', (err: Error) => {
      console.error('[redis] Connection error:', err.message);
    });
  }
  return redisClient;
}

function createLimiter(points: number, prefix: string) {
  const redis = getRedis();
  const limiter: RateLimiterRedis | RateLimiterMemory = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        points,
        duration: 60, // seconds per window
        keyPrefix: prefix,
      })
    : new RateLimiterMemory({
        points,
        duration: 60,
        keyPrefix: prefix,
      });

  return {
    /**
     * Consume one point for the given key.
     * Returns { success, reset } matching the previous @upstash/ratelimit interface
     * so with-api-key.ts needs zero changes.
     *
     * reset is the Unix timestamp (ms) when the window resets, matching Upstash behaviour.
     */
    async limit(key: string): Promise<{ success: boolean; reset: number }> {
      try {
        const res = await limiter.consume(key);
        // msBeforeNext is ms until window resets; 0 when the limiter is fresh
        const reset = Date.now() + (res.msBeforeNext ?? 0);
        return { success: true, reset };
      } catch (err: unknown) {
        // RateLimiterRes is thrown on exhaustion; it also carries msBeforeNext
        const rlErr = err as { msBeforeNext?: number };
        const reset = Date.now() + (rlErr.msBeforeNext ?? 60_000);
        return { success: false, reset };
      }
    },
  };
}

// General API rate limiter: 10 requests per 60-second window, keyed by API key prefix
export const ratelimit = createLimiter(10, 'uploadkit:rl');

// Upload rate limiter: 30 requests per 60-second window, keyed by API key prefix
export const uploadRatelimit = createLimiter(30, 'uploadkit:url');
