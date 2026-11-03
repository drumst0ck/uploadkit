import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  files: [] as any[],
  usage: { storageUsed: 0, uploads: 0 },
  project: { _id: 'p1', slug: 'my-proj-abc123', name: 'My proj', userId: 'u1', save: undefined as any },
  head: { ContentLength: 100 } as { ContentLength?: number },
  r2Fail: new Set<string>(),
}));

const tick = () => new Promise((r) => setTimeout(r, 0));

vi.mock('../auth', () => ({ auth: async () => ({ user: { id: 'u1', email: 'a@b.c' } }) }));
vi.mock('@/lib/storage', () => ({
  r2Client: {
    send: async (cmd: any) => {
      await tick();
      if (cmd.constructor.name === 'DeleteObjectCommand' && h.r2Fail.has(cmd.input.Key)) throw new Error('boom');
      if (cmd.constructor.name === 'HeadObjectCommand') return h.head;
      return {};
    },
  },
  R2_BUCKET: 'b',
  CDN_URL: 'https://cdn.test',
}));
vi.mock('@uploadkitdev/db', () => {
  const match = (f: any, q: any) =>
    Object.entries(q).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && '$in' in v) return v.$in.map(String).includes(String(f[k]));
      return String(f[k]) === String(v);
    });
  return {
    connectDB: async () => undefined,
    Project: {
      findOne: (q: any) => {
        const r = q.slug === h.project.slug && q.userId === 'u1' ? h.project : null;
        const p: any = Promise.resolve(r);
        p.lean = async () => r;
        return p;
      },
    },
    File: {
      find: (q: any) => ({
        select: () => ({ lean: async () => h.files.filter((f) => match(f, { ...q, _id: q._id, projectId: q.projectId, deletedAt: q.deletedAt })).map((f) => ({ ...f })) }),
      }),
      findOne: async (q: any) => h.files.find((f) => match(f, q)) ?? null,
      findOneAndUpdate: async (q: any, u: any) => {
        await tick();
        const f = h.files.find((x) => match(x, q));
        if (!f) return null;
        const before = { ...f }; // mongoose returns the pre-update document by default
        Object.assign(f, u.$set);
        return before;
      },
      findByIdAndUpdate: async (id: any, u: any) => {
        const f = h.files.find((x) => String(x._id) === String(id));
        if (f) Object.assign(f, u.$set);
        return f ?? null;
      },
      updateMany: async () => ({}),
    },
    UsageRecord: {
      updateOne: async (q: any, u: any) => {
        if (q.storageUsed?.$lt === 0 && h.usage.storageUsed < 0) h.usage.storageUsed = u.$set.storageUsed;
        return {};
      },
      findOneAndUpdate: async (_q: any, u: any) => {
        h.usage.storageUsed += u.$inc?.storageUsed ?? 0;
        h.usage.uploads += u.$inc?.uploads ?? 0;
        return h.usage;
      },
    },
  };
});
vi.mock('mongoose', async (orig) => {
  const m: any = await orig();
  return { ...m, default: { ...m.default, isValidObjectId: () => true, Types: { ObjectId: class { constructor(public v: string) {} toString() { return this.v; } } } } };
});

import { PUT } from '@/app/api/internal/projects/[slug]/route';
import { DELETE } from '@/app/api/internal/projects/[slug]/files/route';
import { POST as COMPLETE } from '@/app/api/internal/projects/[slug]/upload/complete/route';

const params = { params: Promise.resolve({ slug: 'my-proj-abc123' }) };
const req = (method: string, body: unknown) =>
  new NextRequest('http://localhost/x', { method, body: JSON.stringify(body) });

beforeEach(() => {
  h.files.length = 0;
  h.usage = { storageUsed: 1000, uploads: 5 };
  h.r2Fail.clear();
  h.head = { ContentLength: 100 };
  h.project.save = vi.fn(async () => undefined);
  h.project.name = 'My proj';
  h.project.slug = 'my-proj-abc123';
});

describe('rename project', () => {
  it('changes the name but keeps the slug stable', async () => {
    const res = await PUT(req('PUT', { name: 'Totally New Name' }), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: 'Totally New Name', slug: 'my-proj-abc123' });
    expect(h.project.slug).toBe('my-proj-abc123');
  });
});

describe('bulk file delete usage counters', () => {
  const file = (id: string, size: number, status = 'UPLOADED') => ({
    _id: id, key: `p1/dashboard/${id}/f`, size, status, projectId: 'p1', deletedAt: null,
  });

  it('does not reclaim bytes for files that were never counted (UPLOADING)', async () => {
    h.files.push(file('a', 100), file('b', 500, 'UPLOADING'));
    const res = await DELETE(req('DELETE', { fileIds: ['a', 'b'] }), params);
    expect(res.status).toBe(200);
    expect(h.usage.storageUsed).toBe(900);
  });

  it('concurrent deletes of the same file reclaim its bytes once', async () => {
    h.files.push(file('a', 100));
    await Promise.all([
      DELETE(req('DELETE', { fileIds: ['a'] }), params),
      DELETE(req('DELETE', { fileIds: ['a'] }), params),
    ]);
    expect(h.usage.storageUsed).toBe(900);
  });

  it('never leaves storageUsed negative (file counted in an earlier period)', async () => {
    h.usage.storageUsed = 50;
    h.files.push(file('a', 100));
    await DELETE(req('DELETE', { fileIds: ['a'] }), params);
    expect(h.usage.storageUsed).toBe(0);
  });

  it('duplicate ids in the request are deduplicated, not rejected', async () => {
    h.files.push(file('a', 100));
    const res = await DELETE(req('DELETE', { fileIds: ['a', 'a', 'a'] }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(1);
    expect(h.usage.storageUsed).toBe(900);
  });

  it('rejects an oversized id array', async () => {
    const res = await DELETE(req('DELETE', { fileIds: Array.from({ length: 501 }, (_, i) => `id${i}`) }), params);
    expect(res.status).toBe(400);
  });

  it('failed R2 deletes keep rows and counters', async () => {
    h.files.push(file('a', 100), file('b', 200));
    h.r2Fail.add('p1/dashboard/b/f');
    const res = await DELETE(req('DELETE', { fileIds: ['a', 'b'] }), params);
    expect((await res.json()).failed).toBe(1);
    expect(h.files.find((f) => f._id === 'b').status).toBe('UPLOADED');
    expect(h.usage.storageUsed).toBe(900);
  });
});

describe('upload complete', () => {
  const uploading = () => ({ _id: 'f1', key: 'p1/dashboard/f1/x', size: 100, name: 'x', type: 'text/plain', status: 'UPLOADING', projectId: 'p1' });

  it('counts usage once when completion is called concurrently', async () => {
    h.files.push(uploading());
    await Promise.all([
      COMPLETE(req('POST', { fileId: 'f1' }), params),
      COMPLETE(req('POST', { fileId: 'f1' }), params),
    ]);
    expect(h.usage).toEqual({ storageUsed: 1100, uploads: 6 });
  });

  it('rejects when the stored object size differs from the declared size, no usage change', async () => {
    h.files.push(uploading());
    h.head = { ContentLength: 999999 };
    const res = await COMPLETE(req('POST', { fileId: 'f1' }), params);
    expect(res.status).toBe(422);
    expect(h.usage).toEqual({ storageUsed: 1000, uploads: 5 });
    expect(h.files[0].status).not.toBe('UPLOADED');
  });
});
