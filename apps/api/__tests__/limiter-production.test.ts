import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(),
  ApiKey: { findOne: vi.fn(() => ({ populate: async () => null })) },
  Subscription: { findOne: vi.fn() },
}));

beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('rate limiter configuration', () => {
  it('keeps the in-memory fallback outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('REDIS_URL', '');
    const { createLimiter } = await import('@/lib/limiter');
    const limiter = createLimiter(1, 'test:dev');
    expect((await limiter.limit('k')).success).toBe(true);
    expect((await limiter.limit('k')).success).toBe(false);
  });

  it('fails closed with a clear configuration error in production without REDIS_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REDIS_URL', '');
    const { createLimiter } = await import('@/lib/limiter');
    const limiter = createLimiter(5, 'test:prod');
    await expect(limiter.limit('k')).rejects.toMatchObject({ code: 'RATE_LIMITER_NOT_CONFIGURED', statusCode: 503, message: expect.stringContaining('REDIS_URL') });
    await expect(limiter.check('k')).rejects.toMatchObject({ statusCode: 503 });
  });

  it('surfaces a 503 from authenticated routes instead of falling back to memory', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REDIS_URL', '');
    vi.stubEnv('API_TRUSTED_IP_HEADER', '');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { withApiKey } = await import('@/lib/with-api-key');
    const handler = vi.fn();
    const res = await withApiKey(handler)(new NextRequest('http://localhost/api/v1/files', { headers: { authorization: 'Bearer anything' } }), { params: Promise.resolve({}) });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('RATE_LIMITER_NOT_CONFIGURED');
    expect(handler).not.toHaveBeenCalled();
  });
});
