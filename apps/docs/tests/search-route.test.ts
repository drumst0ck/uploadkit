import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/source', () => ({ source: {} }));
vi.mock('fumadocs-core/search/server', () => ({
  createFromSource: () => ({ GET: async () => new Response('[]', { status: 200 }) }),
}));

import { GET } from '@/app/api/search/route';

const req = (ip?: string) => new Request('http://docs/api/search?query=x', { headers: ip ? { 'x-real-ip': ip } : {} });

describe('GET /api/search', () => {
  it('returns 429 with Retry-After after the per-IP limit, other IPs unaffected', async () => {
    let last = 200;
    for (let i = 0; i < 70; i++) last = (await GET(req('9.9.9.9'))).status;
    expect(last).toBe(429);
    const blocked = await GET(req('9.9.9.9'));
    expect(blocked.headers.get('retry-after')).toBeTruthy();
    expect((await GET(req('8.8.8.8'))).status).toBe(200);
  });
  it('does not limit when x-real-ip is absent', async () => {
    for (let i = 0; i < 100; i++) expect((await GET(req())).status).toBe(200);
  });
});
