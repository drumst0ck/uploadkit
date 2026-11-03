import { describe, it, expect, vi, beforeEach } from 'vitest';

const ping = vi.fn();
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(async () => ({ connection: { db: { admin: () => ({ ping }) } } })),
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => { ping.mockReset(); });

  it('returns 200 ok with database up and no secrets', async () => {
    ping.mockResolvedValue({ ok: 1 });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok', checks: { database: 'up' } });
    expect(JSON.stringify(body)).not.toContain('mongodb://');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('returns 503 degraded when the database ping fails, without leaking the error', async () => {
    ping.mockImplementation(() => Promise.reject(new Error('connect mongodb://user:pw@host failed')));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
    expect(JSON.stringify(body)).not.toContain('pw@host');
  });

  it('returns 503 when the ping hangs past the timeout', async () => {
    ping.mockReturnValue(new Promise(() => {}));
    const res = await GET();
    expect(res.status).toBe(503);
  }, 10_000);
});
