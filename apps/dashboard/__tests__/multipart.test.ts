import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  files: [] as any[],
  usage: { storageUsed: 1000, uploads: 5 },
  sent: [] as any[],
  head: { ContentLength: 12 * 1024 * 1024 } as { ContentLength?: number },
  partInputs: [] as any[],
}));

vi.mock('../auth', () => ({ auth: async () => ({ user: { id: 'u1', email: 'a@b.c' } }) }));
vi.mock('@/lib/storage', () => ({
  r2Client: {
    send: async (cmd: any) => {
      const name = cmd.constructor.name;
      h.sent.push(name);
      if (name === 'HeadObjectCommand') return h.head;
      if (name === 'CreateMultipartUploadCommand') return { UploadId: 'up1' };
      return {};
    },
  },
  R2_BUCKET: 'b',
  CDN_URL: 'https://cdn.test',
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_c: any, cmd: any) => {
    h.partInputs.push(cmd.input);
    return 'https://r2.test/part';
  },
}));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: async () => undefined,
  Project: {
    findOne: () => {
      const r = { _id: 'p1', slug: 'proj', userId: 'u1' };
      const p: any = Promise.resolve(r);
      p.lean = async () => r;
      return p;
    },
  },
  Subscription: { findOne: () => ({ lean: async () => ({ tier: 'PRO' }) }) },
  UsageRecord: {
    findOne: async () => null,
    findOneAndUpdate: async (_q: any, u: any) => {
      h.usage.storageUsed += u.$inc.storageUsed;
      h.usage.uploads += u.$inc.uploads;
      return h.usage;
    },
  },
  File: {
    create: async (d: any) => {
      const f = { _id: 'f1', ...d };
      h.files.push(f);
      return f;
    },
    findOne: async (q: any) => h.files.find((f) => f.status === q.status && String(f._id) === String(q._id)) ?? null,
    findOneAndUpdate: async (q: any, u: any) => {
      const f = h.files.find((x) => String(x._id) === String(q._id) && x.status === q.status);
      if (!f) return null;
      Object.assign(f, u.$set);
      return f;
    },
    findByIdAndUpdate: async (id: any, u: any) => {
      const f = h.files.find((x) => String(x._id) === String(id));
      if (f) Object.assign(f, u.$set);
      return f ?? null;
    },
  },
}));
vi.mock('mongoose', async (orig) => {
  const m: any = await orig();
  return { ...m, default: { ...m.default, isValidObjectId: () => true } };
});

import { POST as INIT } from '@/app/api/internal/projects/[slug]/upload/multipart/init/route';
import { POST as COMPLETE } from '@/app/api/internal/projects/[slug]/upload/multipart/complete/route';

const params = { params: Promise.resolve({ slug: 'proj' }) };
const req = (body: unknown) => new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify(body) });
const MB = 1024 * 1024;

beforeEach(() => {
  h.files.length = 0;
  h.sent.length = 0;
  h.partInputs.length = 0;
  h.usage = { storageUsed: 1000, uploads: 5 };
  h.head = { ContentLength: 12 * MB };
});

describe('row 10: multipart size integrity', () => {
  it('init locks ContentLength on every part so the parts add up to the declared size', async () => {
    const res = await INIT(req({ fileName: 'a.bin', fileSize: 12 * MB, contentType: 'application/octet-stream' }), params);
    expect(res.status).toBe(200);
    const lengths = h.partInputs.map((i) => i.ContentLength);
    expect(lengths.every((n) => typeof n === 'number')).toBe(true);
    expect(lengths.reduce((a, b) => a + b, 0)).toBe(12 * MB);
    expect(lengths).toEqual([5 * MB, 5 * MB, 2 * MB]);
  });

  const seed = () =>
    h.files.push({ _id: 'f1', key: 'p1/dashboard/x/a.bin', size: 12 * MB, name: 'a.bin', type: 'x/y', status: 'UPLOADING', uploadId: 'up1', projectId: 'p1' });
  const parts = (n: number) => Array.from({ length: n }, (_, i) => ({ partNumber: i + 1, etag: `e${i}` }));

  it('complete rejects when the assembled object size differs, deletes it and records no usage', async () => {
    seed();
    h.head = { ContentLength: 9_000 * MB };
    const res = await COMPLETE(req({ fileId: 'f1', uploadId: 'up1', parts: parts(3) }), params);
    expect(res.status).toBe(422);
    expect(h.usage).toEqual({ storageUsed: 1000, uploads: 5 });
    expect(h.files[0].status).toBe('FAILED');
    expect(h.sent).toContain('DeleteObjectCommand');
  });

  it('complete rejects a part count that does not match the declared size', async () => {
    seed();
    const res = await COMPLETE(req({ fileId: 'f1', uploadId: 'up1', parts: parts(2) }), params);
    expect(res.status).toBe(400);
    expect(h.sent).not.toContain('CompleteMultipartUploadCommand');
    expect(h.files[0].status).toBe('UPLOADING');
  });

  it('complete accepts a matching object and counts usage once', async () => {
    seed();
    const res = await COMPLETE(req({ fileId: 'f1', uploadId: 'up1', parts: parts(3) }), params);
    expect(res.status).toBe(200);
    expect(h.usage).toEqual({ storageUsed: 1000 + 12 * MB, uploads: 6 });
  });
});
