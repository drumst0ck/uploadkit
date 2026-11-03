import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(), ApiKey: { findOne: vi.fn().mockReturnValue({ populate: async () => null }) }, Subscription: {},
}));
vi.mock('@/lib/rate-limit', () => ({ ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) } }));
import { ApiKey } from '@uploadkitdev/db';
import { withApiKey } from '@/lib/with-api-key';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('pre-authentication rate limits', () => {
  it('bounds lookups for rotating invalid tokens even with spoofed forwarding headers', async () => {
    vi.stubEnv('API_TRUSTED_IP_HEADER', '');
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withApiKey(handler);
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) {
      const req = new NextRequest('http://localhost/api/v1/projects', { headers: { authorization: `Bearer random-${i}`, 'x-forwarded-for': `192.0.2.${i}`, 'x-real-ip': `192.0.2.${i}` } });
      statuses.push((await wrapped(req, { params: Promise.resolve({}) })).status);
    }
    expect(statuses).toContain(429);
    expect(ApiKey.findOne).toHaveBeenCalledTimes(30);
    expect(handler).not.toHaveBeenCalled();
  });
  it('isolates failure buckets by a valid operator-trusted IP header', async () => {
    vi.stubEnv('API_TRUSTED_IP_HEADER', 'x-real-ip');
    const wrapped = withApiKey(vi.fn());
    async function call(ip: string, index: number) {
      return wrapped(new NextRequest('http://localhost/api/v1/projects', { headers: { authorization: `Bearer invalid-${index}`, 'x-real-ip': ip } }), { params: Promise.resolve({}) });
    }
    for (let i = 0; i < 30; i++) expect((await call('203.0.113.1', i)).status).toBe(401);
    expect((await call('203.0.113.1', 31)).status).toBe(429);
    expect((await call('203.0.113.2', 32)).status).toBe(401);
    expect(ApiKey.findOne).toHaveBeenCalledTimes(31);
  });
});
