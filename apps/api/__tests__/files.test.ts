import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkit/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
  File: {
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  UsageRecord: {
    findOneAndUpdate: vi.fn(),
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

import { GET } from '@/app/api/v1/files/route';
import { DELETE } from '@/app/api/v1/files/[key]/route';
import { ApiKey, Subscription, File, UsageRecord } from '@uploadkit/db';
import { ratelimit } from '@/lib/rate-limit';
import { r2Client } from '@/lib/storage';

const fakeProject = { _id: 'proj-files', userId: 'user-files', name: 'Files Project' };
const fakeApiKeyDoc = { _id: 'key-files', projectId: fakeProject, keyHash: 'hash', revokedAt: null };

function setupAuth() {
  vi.mocked(ratelimit.limit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(fakeApiKeyDoc),
  } as any);
  vi.mocked(ApiKey.updateOne).mockResolvedValue({} as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

const fakeFiles = [
  { _id: { toString: () => 'file-1' }, key: 'proj/img/a/photo.jpg', name: 'photo.jpg', size: 1024, type: 'image/jpeg', status: 'UPLOADED', deletedAt: null, projectId: 'proj-files' },
  { _id: { toString: () => 'file-2' }, key: 'proj/img/b/doc.pdf', name: 'doc.pdf', size: 2048, type: 'application/pdf', status: 'UPLOADED', deletedAt: null, projectId: 'proj-files' },
];

describe('GET /api/v1/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('returns paginated file list with nextCursor when there are more files', async () => {
    // Return limit+1 files to trigger hasMore=true
    const manyFiles = [...fakeFiles, { _id: { toString: () => 'file-3' }, key: 'proj/img/c/img.png', name: 'img.png', size: 512 }];
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(manyFiles),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/files?limit=2', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.files).toHaveLength(2);
    expect(body.hasMore).toBe(true);
    expect(body.nextCursor).toBe('file-2'); // last item of the returned page
  });

  it('returns file list filtered by projectId (scoped by withApiKey context)', async () => {
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeFiles),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/files?limit=50', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    // Verify File.find was called with the project filter from context
    const findCall = vi.mocked(File.find).mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(findCall['projectId']).toBe('proj-files');
  });

  it('returns empty list with hasMore=false when no files exist', async () => {
    vi.mocked(File.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/files?limit=50', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.files).toHaveLength(0);
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });
});

describe('DELETE /api/v1/files/:key', () => {
  const fakeFile = {
    _id: 'file-to-delete',
    key: 'proj-files/img/abc/photo.jpg',
    size: 4096,
    projectId: 'proj-files',
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(fakeFile as any);
    vi.mocked(File.findByIdAndUpdate).mockResolvedValue({ ...fakeFile, deletedAt: new Date(), status: 'DELETED' } as any);
    vi.mocked(r2Client.send).mockResolvedValue({} as any);
    vi.mocked(UsageRecord.findOneAndUpdate).mockResolvedValue({} as any);
  });

  it('removes file from R2 and soft-deletes in DB', async () => {
    const encodedKey = encodeURIComponent('proj-files/img/abc/photo.jpg');
    const req = new NextRequest(`http://localhost/api/v1/files/${encodedKey}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ key: 'proj-files/img/abc/photo.jpg' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // R2 delete called
    expect(r2Client.send).toHaveBeenCalled();
    // DB soft-delete called
    expect(File.findByIdAndUpdate).toHaveBeenCalledWith(
      'file-to-delete',
      expect.objectContaining({ $set: expect.objectContaining({ status: 'DELETED' }) }),
    );
  });

  it('decrements storageUsed atomically', async () => {
    const encodedKey = encodeURIComponent('proj-files/img/abc/photo.jpg');
    const req = new NextRequest(`http://localhost/api/v1/files/${encodedKey}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    await DELETE(req, { params: Promise.resolve({ key: 'proj-files/img/abc/photo.jpg' }) });

    expect(UsageRecord.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-files' }),
      expect.objectContaining({ $inc: { storageUsed: -4096 } }),
      expect.anything(),
    );
  });
});
