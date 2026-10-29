import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const send = vi.fn().mockResolvedValue({});

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: { findOne: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) },
  Subscription: { findOne: vi.fn() },
  Project: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn() },
  uploadRatelimit: { limit: vi.fn() },
}));
vi.mock('@/lib/storage', () => ({
  r2Client: { send: (...a: unknown[]) => send(...a) },
  R2_BUCKET: 'test-bucket',
  CDN_URL: 'https://cdn.uploadkit.dev',
}));

import { PATCH } from '@/app/api/v1/projects/[id]/route';
import { signCdnUrl } from '@/lib/cdn-access';
import { ApiKey, Subscription, Project } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';
import { createHmac } from 'node:crypto';

const ID = '64b7f0a1c2d3e4f5a6b7c8d9';
const project = { _id: ID, userId: 'u1', name: 'P', slug: 'p' };

function patch(body: unknown) {
  const req = new NextRequest(`http://localhost/api/v1/projects/${ID}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer uk_live_x', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id: ID }) });
}

describe('project CDN access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMAGE_TRANSFORM_SECRET = 'test-secret';
    vi.mocked(ratelimit.limit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      pending: Promise.resolve(), reason: 'cacheBlock',
    } as any);
    vi.mocked(ApiKey.findOne).mockReturnValue({
      populate: vi.fn().mockResolvedValue({ _id: 'k', projectId: project, keyHash: 'h', revokedAt: null }),
    } as any);
    vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
    send.mockReset().mockResolvedValue({});
    vi.mocked(Project.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'public' }),
    } as any);
    vi.mocked(Project.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'signed' }),
    } as any);
  });


  it('going signed: updates the DB first, then writes the marker', async () => {
    const order: string[] = [];
    vi.mocked(Project.findOneAndUpdate).mockImplementation((() => {
      order.push('db');
      return { lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'signed' }) };
    }) as any);
    send.mockImplementation(async (c: { constructor: { name: string } }) => { order.push(c.constructor.name); return {}; });
    const res = await patch({ cdnAccess: 'signed' });
    expect(res.status).toBe(200);
    expect(order).toEqual(['db', 'PutObjectCommand']);
    const cmd = send.mock.calls[0]![0] as { input: { Bucket: string; Key: string } };
    expect(cmd.input).toMatchObject({ Bucket: 'test-bucket', Key: `_acl/${ID}` });
  });

  it('going signed: reverts the DB when the marker write fails', async () => {
    send.mockRejectedValueOnce(new Error('r2 down'));
    const res = await patch({ cdnAccess: 'signed' });
    expect(res.status).toBeGreaterThanOrEqual(500);
    const calls = vi.mocked(Project.findOneAndUpdate).mock.calls;
    expect(calls).toHaveLength(2);
    expect((calls[1]![1] as any).$set.cdnAccess).toBe('public');
  });

  it('going public: deletes the marker first, then updates the DB', async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'signed' }),
    } as any);
    const order: string[] = [];
    vi.mocked(Project.findOneAndUpdate).mockImplementation((() => {
      order.push('db');
      return { lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'public' }) };
    }) as any);
    send.mockImplementation(async (c: { constructor: { name: string } }) => { order.push(c.constructor.name); return {}; });
    const res = await patch({ cdnAccess: 'public' });
    expect(res.status).toBe(200);
    expect(order).toEqual(['DeleteObjectCommand', 'db']);
  });

  it('going public: a failed marker delete leaves the DB signed', async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...project, cdnAccess: 'signed' }),
    } as any);
    send.mockRejectedValueOnce(new Error('r2 down'));
    const res = await patch({ cdnAccess: 'public' });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects unknown access modes without touching storage', async () => {
    const res = await patch({ cdnAccess: 'private' });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('signs URLs the way the worker verifies them', () => {
    const key = `${ID}/r/abc/a b.png`;
    const url = signCdnUrl(`https://cdn.uploadkit.dev/${ID}/r/abc/a%20b.png`, key, 1_000_000);
    const u = new URL(url);
    expect(u.searchParams.get('exp')).toBe(String(1_000_000 + 3600));
    const expected = createHmac('sha256', 'test-secret')
      .update(`cdn\n${1_000_000 + 3600}\n${key}`).digest('base64url');
    expect(u.searchParams.get('sig')).toBe(expected);
  });
});
