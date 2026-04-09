import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  File: {
    find: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find_lean: vi.fn(),
  },
  ApiKey: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
  FileRouter: {
    findOne: vi.fn(),
  },
  UsageRecord: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  Project: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
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

import { GET } from '@/app/api/v1/logs/route';
import { File, ApiKey, Subscription } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';

const fakeProject = { _id: 'proj-logs', userId: 'user-logs', name: 'Logs Project' };
const fakeApiKeyDoc = { _id: 'key-logs', projectId: fakeProject, keyHash: 'hash', revokedAt: null };

function setupAuth() {
  vi.mocked(ratelimit.limit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(fakeApiKeyDoc),
  } as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

describe('GET /api/v1/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('returns logs filtered by since timestamp', async () => {
    const since = new Date('2024-01-01T00:00:00Z');
    const fakeFiles = [
      { _id: 'f1', key: 'proj/img/abc/photo.jpg', name: 'photo.jpg', size: 1024, type: 'image/jpeg', status: 'UPLOADED', createdAt: new Date('2024-01-02'), updatedAt: new Date('2024-01-02') },
    ];
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeFiles),
    } as any);

    const req = new NextRequest(`http://localhost/api/v1/logs?since=${since.toISOString()}&limit=50`, {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].id).toBe('f1');
    expect(body.count).toBe(1);
  });

  it('returns empty array when no logs match', async () => {
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/logs?since=2099-01-01T00:00:00Z&limit=50', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logs).toHaveLength(0);
    expect(body.count).toBe(0);
  });

  it('returns 400 when since parameter is missing or invalid', async () => {
    const req = new NextRequest('http://localhost/api/v1/logs', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
