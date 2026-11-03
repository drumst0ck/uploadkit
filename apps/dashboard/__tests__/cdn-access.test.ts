import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';

const h = vi.hoisted(() => ({
  project: { _id: 'p1', slug: 'proj', userId: 'u1', cdnAccess: 'public' } as any,
  files: [] as any[],
  sent: [] as string[],
  failMarker: false,
  dbCalls: [] as string[],
}));

vi.mock('../auth', () => ({ auth: async () => ({ user: { id: 'u1', email: 'a@b.c' } }) }));
vi.mock('@/lib/storage', () => ({
  r2Client: {
    send: async (cmd: any) => {
      const name = cmd.constructor.name;
      if (cmd.input.Key?.startsWith('_acl/')) {
        h.sent.push(`${name}:${cmd.input.Key}`);
        h.dbCalls.push(`marker:${name}`);
        if (h.failMarker) throw new Error('r2 down');
      }
      return {};
    },
  },
  R2_BUCKET: 'b',
  CDN_URL: 'https://cdn.test',
}));
vi.mock('@/lib/presign', () => ({ generatePresignedPutUrl: async () => 'https://r2.test/put' }));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: async () => undefined,
  Subscription: { findOne: () => ({ lean: async () => ({ tier: 'PRO' }) }) },
  UsageRecord: { findOne: async () => null },
  Project: {
    findOne: (q: any) => {
      const r = q.slug === 'proj' && q.userId === 'u1' ? { ...h.project } : null;
      const p: any = Promise.resolve(r);
      p.lean = async () => r;
      return p;
    },
    findOneAndUpdate: async (_q: any, u: any) => {
      h.dbCalls.push(`db:${u.$set.cdnAccess}`);
      Object.assign(h.project, u.$set);
      return { ...h.project };
    },
  },
  File: {
    create: async (d: any) => ({ _id: 'f1', ...d }),
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => h.files }) }), }),
    countDocuments: async () => h.files.length,
  },
}));

import { signCdnUrl, withSignedUrl } from '@/lib/cdn-access';
import { PUT as TOGGLE } from '@/app/api/internal/projects/[slug]/cdn-access/route';
import { GET as LIST } from '@/app/api/internal/projects/[slug]/files/route';
import { POST as UPLOAD_REQUEST } from '@/app/api/internal/projects/[slug]/upload/request/route';

const params = { params: Promise.resolve({ slug: 'proj' }) };
const req = (method: string, body?: unknown, url = 'http://localhost/x') =>
  new NextRequest(url, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

beforeEach(() => {
  process.env.IMAGE_TRANSFORM_SECRET = 'test-secret';
  h.project = { _id: 'p1', slug: 'proj', userId: 'u1', cdnAccess: 'public' };
  h.files = [{ _id: 'f1', key: 'p1/dashboard/a/x.png', url: 'https://cdn.test/p1/dashboard/a/x.png', name: 'x.png' }];
  h.sent = [];
  h.dbCalls = [];
  h.failMarker = false;
});

describe('signCdnUrl', () => {
  it('uses the HMAC format the worker verifies', () => {
    const url = signCdnUrl('https://cdn.test/k/a.png', 'k/a.png', 1_000);
    const u = new URL(url);
    const exp = 1_000 + 3_600;
    expect(u.searchParams.get('exp')).toBe(String(exp));
    expect(u.searchParams.get('sig')).toBe(
      createHmac('sha256', 'test-secret').update(`cdn\n${exp}\nk/a.png`).digest('base64url'),
    );
  });
  it('leaves public projects unchanged', () => {
    const f = { key: 'k', url: 'https://cdn.test/k' };
    expect(withSignedUrl({ cdnAccess: 'public' }, f)).toBe(f);
    expect(withSignedUrl({}, f)).toBe(f);
  });
});

describe('project cdn access toggle', () => {
  it('signed: persists, then announces the marker to the worker', async () => {
    const res = await TOGGLE(req('PUT', { access: 'signed' }), params);
    expect(res.status).toBe(200);
    expect(h.project.cdnAccess).toBe('signed');
    expect(h.dbCalls).toEqual(['db:signed', 'marker:PutObjectCommand']);
    expect(h.sent).toEqual(['PutObjectCommand:_acl/p1']);
  });
  it('signed: reverts the setting when the marker write fails', async () => {
    h.failMarker = true;
    const res = await TOGGLE(req('PUT', { access: 'signed' }), params);
    expect(res.status).toBe(502);
    expect(h.project.cdnAccess).toBe('public');
  });
  it('public: removes the marker before flipping the setting', async () => {
    h.project.cdnAccess = 'signed';
    const res = await TOGGLE(req('PUT', { access: 'public' }), params);
    expect(res.status).toBe(200);
    expect(h.dbCalls).toEqual(['marker:DeleteObjectCommand', 'db:public']);
  });
  it('rejects invalid values without touching anything', async () => {
    const res = await TOGGLE(req('PUT', { access: 'private' }), params);
    expect(res.status).toBe(400);
    expect(h.dbCalls).toEqual([]);
  });
});

describe('dashboard reads sign File.url for signed projects', () => {
  it('files list returns signed urls only when the project is signed', async () => {
    let body = await (await LIST(req('GET', undefined, 'http://localhost/x'), params)).json();
    expect(body.files[0].url).toBe('https://cdn.test/p1/dashboard/a/x.png');
    h.project.cdnAccess = 'signed';
    body = await (await LIST(req('GET', undefined, 'http://localhost/x'), params)).json();
    const u = new URL(body.files[0].url);
    expect(u.searchParams.get('sig')).toBeTruthy();
    expect(u.searchParams.get('exp')).toBeTruthy();
  });

  it('upload request returns a signed cdnUrl for signed projects', async () => {
    h.project.cdnAccess = 'signed';
    const res = await UPLOAD_REQUEST(
      req('POST', { fileName: 'x.png', fileSize: 10, contentType: 'image/png' }),
      params,
    );
    const body = await res.json();
    expect(new URL(body.cdnUrl).searchParams.get('sig')).toBeTruthy();
  });
});
