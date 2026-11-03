import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  routes: [] as any[],
  keys: [] as any[],
  lifecycleSaved: 0,
  project: { _id: 'p1', slug: 'proj', userId: 'u1', lifecyclePolicy: { enabled: false, retentionDays: 0 }, save: undefined as any },
  tier: 'FREE',
  seq: 0,
}));

vi.mock('../auth', () => ({ auth: async () => ({ user: { id: 'u1', email: 'a@b.c' } }) }));
vi.mock('@/lib/tier', () => ({ getUserTier: async () => h.tier }));
vi.mock('@uploadkitdev/db', () => {
  const eq = (d: any, q: any) =>
    Object.entries(q).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && '$ne' in v) return String(d[k]) !== String(v.$ne);
      return String(d[k]) === String(v);
    });
  const dup = (data: any, ignoreId?: string) =>
    h.routes.some((r) => r.slug === data.slug && r.projectId === data.projectId && String(r._id) !== ignoreId);
  return {
    connectDB: async () => undefined,
    Project: {
      findOne: (q: any) => {
        const r = q.slug === 'proj' && q.userId === 'u1' ? h.project : null;
        const p: any = Promise.resolve(r);
        p.lean = async () => r;
        return p;
      },
    },
    File: {
      find: () => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) }),
    },
    FileRouter: {
      findOne: async (q: any) => h.routes.find((r) => eq(r, q)) ?? null,
      create: async (data: any) => {
        if (dup(data)) throw Object.assign(new Error('E11000'), { code: 11000 });
        const d = { _id: `r${++h.seq}`, ...data };
        h.routes.push(d);
        return d;
      },
      findOneAndUpdate: async (q: any, u: any) => {
        const d = h.routes.find((r) => String(r._id) === String(q._id) && r.projectId === String(q.projectId));
        if (!d) return null;
        if (u.$set.slug && dup({ ...d, ...u.$set }, String(d._id))) throw Object.assign(new Error('E11000'), { code: 11000 });
        Object.assign(d, u.$set);
        return d;
      },
    },
    ApiKey: {
      find: () => ({ select: () => ({ sort: () => ({ lean: async () => h.keys }) }) }),
      countDocuments: async () => h.keys.length,
      create: async (d: any) => {
        const k = { _id: `k${++h.seq}`, createdAt: new Date(), ...d };
        h.keys.push(k);
        return k;
      },
    },
  };
});
vi.mock('mongoose', async (orig) => {
  const m: any = await orig();
  const ObjectId = class { constructor(public v: string) {} toString() { return this.v; } };
  return { ...m, default: { ...m.default, isValidObjectId: () => true, Types: { ObjectId } } };
});

import { POST as ROUTE_POST, PUT as ROUTE_PUT } from '@/app/api/internal/projects/[slug]/routes/route';
import { POST as KEY_POST } from '@/app/api/internal/projects/[slug]/keys/route';
import { GET as LOGS } from '@/app/api/internal/projects/[slug]/logs/route';
import { PUT as LIFECYCLE } from '@/app/api/internal/projects/[slug]/lifecycle/route';

const params = { params: Promise.resolve({ slug: 'proj' }) };
const req = (method: string, body?: unknown, url = 'http://localhost/x') =>
  new NextRequest(url, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

beforeEach(() => {
  h.routes.length = 0;
  h.keys.length = 0;
  h.tier = 'FREE';
  h.project.lifecyclePolicy = { enabled: false, retentionDays: 0 };
  h.project.save = vi.fn(async () => { h.lifecycleSaved++; });
  h.lifecycleSaved = 0;
});

describe('row 26: webhookUrl validation', () => {
  it.each(['http://example.com/h', 'https://127.0.0.1/h', 'https://localhost/h', 'https://10.1.2.3/h'])(
    'POST rejects %s and stores nothing', async (webhookUrl) => {
      const res = await ROUTE_POST(req('POST', { slug: 'a', webhookUrl }), params);
      expect(res.status).toBe(400);
      expect(h.routes).toHaveLength(0);
    });
  it('POST accepts a public https URL', async () => {
    const res = await ROUTE_POST(req('POST', { slug: 'a', webhookUrl: 'https://hooks.example.com/x' }), params);
    expect(res.status).toBe(201);
  });
  it('PUT rejects an unsafe URL and leaves the route unchanged', async () => {
    await ROUTE_POST(req('POST', { slug: 'a' }), params);
    const id = h.routes[0]._id;
    const res = await ROUTE_PUT(req('PUT', { _id: id, webhookUrl: 'http://evil.test' }), params);
    expect(res.status).toBe(400);
    expect(h.routes[0].webhookUrl).toBeUndefined();
  });
});

describe('row 34: route PUT/POST uniqueness and bounds', () => {
  it('PUT with a duplicate slug returns 409, not 500, and keeps the slug', async () => {
    await ROUTE_POST(req('POST', { slug: 'a' }), params);
    await ROUTE_POST(req('POST', { slug: 'b' }), params);
    const res = await ROUTE_PUT(req('PUT', { _id: h.routes[1]._id, slug: 'a' }), params);
    expect(res.status).toBe(409);
    expect(h.routes[1].slug).toBe('b');
  });
  it.each([0, -5, 1.5, 'x'])('rejects maxFileCount %s', async (maxFileCount) => {
    const res = await ROUTE_POST(req('POST', { slug: 'a', maxFileCount }), params);
    expect([400]).toContain(res.status);
  });
  it('clamps maxFileSize to the plan limit and maxFileCount to 1000', async () => {
    const res = await ROUTE_POST(req('POST', { slug: 'a', maxFileSize: 10 ** 12, maxFileCount: 10 ** 6 }), params);
    expect(res.status).toBe(201);
    expect(h.routes[0].maxFileSize).toBe(4 * 1024 * 1024); // FREE
    expect(h.routes[0].maxFileCount).toBe(1000);
  });
  it('PUT clamps and validates the same way', async () => {
    await ROUTE_POST(req('POST', { slug: 'a' }), params);
    const id = h.routes[0]._id;
    expect((await ROUTE_PUT(req('PUT', { _id: id, maxFileSize: -1 }), params)).status).toBe(400);
    await ROUTE_PUT(req('PUT', { _id: id, maxFileSize: 10 ** 12 }), params);
    expect(h.routes[0].maxFileSize).toBe(4 * 1024 * 1024);
  });
});

describe('row 78: api keys', () => {
  it('rejects names over 64 chars', async () => {
    const res = await KEY_POST(req('POST', { name: 'x'.repeat(65) }), params);
    expect(res.status).toBe(400);
    expect(h.keys).toHaveLength(0);
  });
  it('enforces the plan max of active keys', async () => {
    expect((await KEY_POST(req('POST', { name: 'one' }), params)).status).toBe(201);
    expect((await KEY_POST(req('POST', { name: 'two' }), params)).status).toBe(201);
    const res = await KEY_POST(req('POST', { name: 'three' }), params);
    expect(res.status).toBe(403);
    expect(h.keys).toHaveLength(2);
  });
});

describe('row 79: logs since', () => {
  it('returns 400 for an invalid since', async () => {
    const res = await LOGS(req('GET', undefined, 'http://localhost/x?since=garbage'), params);
    expect(res.status).toBe(400);
  });
  it('accepts a valid ISO since', async () => {
    const res = await LOGS(req('GET', undefined, `http://localhost/x?since=${new Date().toISOString()}`), params);
    expect(res.status).toBe(200);
  });
});

describe('row 80: lifecycle', () => {
  it.each([0, -1, 1.5, 'abc', undefined])('rejects enabled with retentionDays %s', async (retentionDays) => {
    const res = await LIFECYCLE(req('PUT', { enabled: true, retentionDays }), params);
    expect(res.status).toBe(400);
    expect(h.lifecycleSaved).toBe(0);
  });
  it('allows disabling with 0 and enabling with a positive integer', async () => {
    expect((await LIFECYCLE(req('PUT', { enabled: false, retentionDays: 0 }), params)).status).toBe(200);
    expect((await LIFECYCLE(req('PUT', { enabled: true, retentionDays: 30 }), params)).status).toBe(200);
    expect(h.project.lifecyclePolicy).toEqual({ enabled: true, retentionDays: 30 });
  });
});
