import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: { findOne: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) },
  Subscription: { findOne: vi.fn() },
  File: { find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn() },
  uploadRatelimit: { limit: vi.fn() },
}));
vi.mock('@/lib/storage', () => ({
  r2Client: { send: vi.fn() },
  R2_BUCKET: 'test-bucket',
  CDN_URL: 'https://cdn.uploadkit.dev',
}));

import { GET as LIST } from '@/app/api/v1/files/route';
import { GET as GET_ONE } from '@/app/api/v1/files/[key]/route';
import { withSignedUrl } from '@/lib/cdn-access';
import { ApiKey, Subscription, File } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';

const KEY = '64b7f0a1c2d3e4f5a6b7c8d9/r/abc/photo.png';
const file = { _id: { toString: () => 'f1' }, key: KEY, name: 'photo.png', url: `https://cdn.uploadkit.dev/${KEY}` };

function auth(cdnAccess?: 'public' | 'signed') {
  const project = { _id: 'p1', userId: 'u1', ...(cdnAccess ? { cdnAccess } : {}) };
  vi.mocked(ratelimit.limit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue({ _id: 'k', projectId: project, keyHash: 'h', revokedAt: null }),
  } as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

const hdr = { authorization: 'Bearer uk_live_x' };

describe('signed CDN URLs in API responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMAGE_TRANSFORM_SECRET = 'test-secret';
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([file]),
    } as any);
    vi.mocked(File.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(file) } as any);
  });

  it('signs file URLs in the list for a signed project, leaving the stored URL untouched', async () => {
    auth('signed');
    const res = await LIST(new NextRequest('http://localhost/api/v1/files', { headers: hdr }), { params: Promise.resolve({}) });
    const url = new URL((await res.json()).files[0].url);
    const exp = url.searchParams.get('exp')!;
    expect(Number(exp) - Math.floor(Date.now() / 1000)).toBeGreaterThan(3500);
    expect(url.searchParams.get('sig')).toBe(
      createHmac('sha256', 'test-secret').update(`cdn\n${exp}\n${KEY}`).digest('base64url'),
    );
    expect(file.url).not.toContain('sig=');
  });

  it('signs the single-file GET for a signed project', async () => {
    auth('signed');
    const res = await GET_ONE(
      new NextRequest(`http://localhost/api/v1/files/${encodeURIComponent(KEY)}`, { headers: hdr }),
      { params: Promise.resolve({ key: encodeURIComponent(KEY) }) },
    );
    expect(new URL((await res.json()).file.url).searchParams.get('sig')).toBeTruthy();
  });

  it('leaves URLs untouched for public (and legacy, field-less) projects', async () => {
    for (const mode of ['public', undefined] as const) {
      auth(mode);
      const res = await LIST(new NextRequest('http://localhost/api/v1/files', { headers: hdr }), { params: Promise.resolve({}) });
      expect((await res.json()).files[0].url).toBe(file.url);
    }
  });

  it('withSignedUrl keeps other fields and ignores public projects', () => {
    expect(withSignedUrl({ cdnAccess: 'public' }, file)).toBe(file);
    const signed = withSignedUrl({ cdnAccess: 'signed' }, file);
    expect(signed.name).toBe('photo.png');
    expect(signed.url).toContain('sig=');
  });
});
