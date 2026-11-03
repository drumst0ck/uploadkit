import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(), ApiKey: { findOne: vi.fn().mockReturnValue({ populate: async () => null }) }, Subscription: { findOne: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/lib/rate-limit', () => ({ ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) } }));
import { ApiKey } from '@uploadkitdev/db';
import { withApiKey } from '@/lib/with-api-key';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('pre-authentication rate limits', () => {
  it('does not share one global bucket when no trusted client IP is configured', async () => {
    vi.stubEnv('API_TRUSTED_IP_HEADER', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withApiKey(handler);
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) {
      const req = new NextRequest('http://localhost/api/v1/projects', { headers: { authorization: `Bearer random-${i}`, 'x-forwarded-for': `192.0.2.${i}`, 'x-real-ip': `192.0.2.${i}` } });
      const res = await wrapped(req, { params: Promise.resolve({}) });
      statuses.push(res.status);
      if (i === 0) expect((await res.json()).error.code).toBe('UNAUTHORIZED');
    }
    // 40 failures from unknown clients must neither lock anyone out nor 429.
    expect(statuses.every((status) => status === 401)).toBe(true);
    expect(ApiKey.findOne).toHaveBeenCalledTimes(40);
    // A legitimate customer is still served afterwards.
    vi.mocked(ApiKey.findOne).mockReturnValueOnce({ populate: async () => ({ _id: 'k', projectId: { _id: 'p', userId: 'u' } }) } as any);
    (ApiKey as any).updateOne = vi.fn().mockResolvedValue({});
    const ok = await wrapped(new NextRequest('http://localhost/api/v1/projects', { headers: { authorization: 'Bearer valid' } }), { params: Promise.resolve({}) });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
    expect(warn.mock.calls.filter(([m]) => String(m).includes('API_TRUSTED_IP_HEADER')).length).toBeLessThanOrEqual(1);
    warn.mockRestore();
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
