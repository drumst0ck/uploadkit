import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: { findOne: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) },
  Subscription: { findOne: vi.fn() },
  File: { findOne: vi.fn() },
}));

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn() },
  uploadRatelimit: { limit: vi.fn() },
}));

import { POST } from '@/app/api/v1/transforms/image/route';
import { ApiKey, File, Subscription } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';

const project = { _id: 'project-1', userId: 'user-1', name: 'Cloud project' };
const apiKey = { _id: 'key-1', projectId: project, revokedAt: null };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/v1/transforms/image', {
    method: 'POST',
    headers: { authorization: 'Bearer uk_live_test', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setTier(tier: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE') {
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.IMAGE_TRANSFORM_BASE_URL = 'https://cdn.uploadkit.dev';
  process.env.IMAGE_TRANSFORM_SECRET = 'test-secret-at-least-32-characters';
  vi.mocked(ratelimit.limit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as never);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(apiKey),
  } as never);
  vi.mocked(File.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({
      key: 'project-1/images/photo.jpg', type: 'image/jpeg', status: 'UPLOADED',
    }),
  } as never);
});

describe('POST /api/v1/transforms/image', () => {
  it('rejects free projects before looking up a file', async () => {
    setTier('FREE');
    const response = await POST(request({ key: 'project-1/images/photo.jpg', width: 320 }), {
      params: Promise.resolve({}),
    });
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('IMAGE_TRANSFORMS_REQUIRE_PAID_PLAN');
    expect(File.findOne).not.toHaveBeenCalled();
  });

  it('returns a signed canonical URL for a paid cloud file', async () => {
    setTier('PRO');
    const response = await POST(request({
      key: 'project-1/images/photo.jpg', width: 800, fit: 'cover', format: 'auto',
    }), { params: Promise.resolve({}) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/cdn\.uploadkit\.dev\/t\/\d+\/[A-Za-z0-9_-]+\//);
    expect(body.url).toContain('/project-1/images/photo.jpg');
    expect(body.transform).toEqual({ width: 800, fit: 'cover', quality: 85, format: 'auto' });
    expect(File.findOne).toHaveBeenCalledWith(expect.objectContaining({
      key: 'project-1/images/photo.jpg', projectId: 'project-1', status: 'UPLOADED',
    }));
  });

  it('rejects non-image files', async () => {
    setTier('TEAM');
    vi.mocked(File.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ key: 'project-1/report.pdf', type: 'application/pdf' }),
    } as never);
    const response = await POST(request({ key: 'project-1/report.pdf', width: 320 }), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(415);
  });

  it('rejects unbounded transformations before file lookup', async () => {
    setTier('PRO');
    const response = await POST(request({ key: 'project-1/images/photo.jpg', width: 9000 }), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(400);
    expect(File.findOne).not.toHaveBeenCalled();
  });
});
