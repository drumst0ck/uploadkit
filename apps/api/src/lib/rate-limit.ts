import { createLimiter } from './limiter';

// General API rate limiter: 10 requests per 60-second window, keyed by token hash.
export const ratelimit = createLimiter(10, 'uploadkit:rl');

// Upload rate limiter: 30 requests per 60-second window, keyed by token hash.
export const uploadRatelimit = createLimiter(30, 'uploadkit:url');

// Transform URL generation is lightweight and commonly happens in batches
// while rendering galleries. Monthly unit quotas remain the cost boundary.
export const transformRatelimit = createLimiter(120, 'uploadkit:transform');
