import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Lock contention and pending reservations are covered by audit-quota.test.ts.
vi.mock('@/lib/user-quota', () => ({
  withUserQuotaLock: async (_userId: unknown, work: () => Promise<unknown>) => work(),
  reservedUploadUsage: async () => ({ storageUsed: 0, uploads: 0 }),
}));

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
  File: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
  FileRouter: {
    findOne: vi.fn(),
  },
  UsageRecord: {
    findOne: vi.fn(),
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

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/part-presigned'),
}));

vi.mock('@/lib/qstash', () => ({
  enqueueWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { POST as initPOST } from '@/app/api/v1/upload/multipart/init/route';
import { POST as completePOST } from '@/app/api/v1/upload/multipart/complete/route';
import { POST as abortPOST } from '@/app/api/v1/upload/multipart/abort/route';
import { ApiKey, Subscription, File, FileRouter, UsageRecord } from '@uploadkitdev/db';
import { uploadRatelimit } from '@/lib/rate-limit';
import { r2Client } from '@/lib/storage';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const fakeProject = { _id: 'proj-mp', userId: 'user-mp', name: 'Multipart Project' };
const fakeApiKeyDoc = { _id: 'key-mp', projectId: fakeProject, keyHash: 'hash', revokedAt: null };
const fakeFileRouter = {
  _id: 'router-mp',
  slug: 'videos',
  maxFileSize: 1024 * 1024 * 1024, // 1 GB — large enough for multipart
  allowedTypes: [],
  projectId: 'proj-mp',
};

function setupAuth() {
  vi.mocked(uploadRatelimit.limit).mockResolvedValue({
    success: true, limit: 30, remaining: 29, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(fakeApiKeyDoc),
  } as any);
  vi.mocked(ApiKey.updateOne).mockResolvedValue({} as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'PRO' } as any); // PRO to avoid storage limits
}

function makePost(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MULTIPART_FILE_SIZE = 20 * 1024 * 1024; // 20 MB — above 10 MB minimum

describe('POST /api/v1/upload/multipart/init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(FileRouter.findOne).mockResolvedValue(fakeFileRouter as any);
    vi.mocked(UsageRecord.findOne).mockResolvedValue(null);
    vi.mocked(r2Client.send).mockResolvedValue({ UploadId: 'upload-id-abc123' } as any);
    vi.mocked(File.create).mockResolvedValue({
      _id: 'file-mp-1',
      key: 'proj-mp/videos/xyz/video.mp4',
      name: 'video.mp4',
      size: MULTIPART_FILE_SIZE,
      type: 'video/mp4',
      url: 'https://cdn.uploadkit.dev/proj-mp/videos/xyz/video.mp4',
      status: 'UPLOADING',
      uploadId: 'upload-id-abc123',
    } as any);
  });

  it('init returns uploadId and presigned part URLs', async () => {
    const req = makePost('http://localhost/api/v1/upload/multipart/init', {
      fileName: 'video.mp4',
      fileSize: MULTIPART_FILE_SIZE,
      contentType: 'video/mp4',
      routeSlug: 'videos',
    });
    const res = await initPOST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadId).toBe('upload-id-abc123');
    expect(body.fileId).toBe('file-mp-1');
    expect(Array.isArray(body.parts)).toBe(true);
    expect(body.parts.length).toBeGreaterThan(0);
    expect(body.parts[0]).toHaveProperty('partNumber');
    expect(body.parts[0]).toHaveProperty('uploadUrl');
  });
});

describe('POST /api/v1/upload/multipart/complete', () => {
  const fakeUploadingFile = {
    _id: 'file-mp-2',
    key: 'proj-mp/videos/xyz/video.mp4',
    name: 'video.mp4',
    size: MULTIPART_FILE_SIZE,
    type: 'video/mp4',
    url: 'https://cdn.uploadkit.dev/proj-mp/videos/xyz/video.mp4',
    status: 'UPLOADING',
    uploadId: 'upload-id-abc123',
    projectId: 'proj-mp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(fakeUploadingFile as any);
    vi.mocked(File.findByIdAndUpdate).mockResolvedValue({ ...fakeUploadingFile, status: 'UPLOADED', uploadId: null } as any);
    vi.mocked(r2Client.send).mockResolvedValue({} as any);
    vi.mocked(UsageRecord.findOneAndUpdate).mockResolvedValue({ storageUsed: MULTIPART_FILE_SIZE, uploads: 1 } as any);
    vi.mocked(FileRouter.findOne).mockResolvedValue(null);
  });

  it('complete assembles ETags and finalizes upload', async () => {
    const req = makePost('http://localhost/api/v1/upload/multipart/complete', {
      fileId: 'file-mp-2',
      uploadId: 'upload-id-abc123',
      parts: [
        { partNumber: 1, etag: '"etag-part-1"' },
        { partNumber: 2, etag: '"etag-part-2"' },
      ],
    });
    const res = await completePOST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.file).toBeDefined();
    expect(body.file.status).toBe('UPLOADED');
    // Verify R2 was called with CompleteMultipartUploadCommand
    expect(r2Client.send).toHaveBeenCalled();
  });
});

describe('POST /api/v1/upload/multipart/complete real stored object', () => {
  const file = { _id: 'file-mp-9', key: 'proj-mp/videos/xyz/video.mp4', name: 'video.mp4', size: MULTIPART_FILE_SIZE, type: 'video/mp4', status: 'UPLOADING', uploadId: 'up-1', projectId: 'proj-mp' };
  const body = { fileId: 'file-mp-9', uploadId: 'up-1', parts: [{ partNumber: 1, etag: '"e1"' }] };
  function head(meta: { ContentLength?: number; ContentType?: string }) {
    vi.mocked(r2Client.send).mockImplementation((async (command: unknown) => (command instanceof HeadObjectCommand ? meta : {})) as any);
  }
  const call = () => completePOST(makePost('http://localhost/api/v1/upload/multipart/complete', body), { params: Promise.resolve({}) });
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(file as any);
    vi.mocked(File.findByIdAndUpdate).mockImplementation((async (_id: unknown, update: any) => ({ ...file, ...update.$set })) as any);
    vi.mocked(File.findOneAndUpdate).mockResolvedValue({ ...file, status: 'DELETED' } as any);
    vi.mocked(UsageRecord.findOneAndUpdate).mockResolvedValue({ storageUsed: 1, uploads: 1 } as any);
    vi.mocked(FileRouter.findOne).mockResolvedValue(null);
  });

  it('records the real stored size in the file and usage', async () => {
    head({ ContentLength: 12345, ContentType: 'video/mp4' });
    const res = await call();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.file.size).toBe(12345);
    expect(File.findByIdAndUpdate).toHaveBeenCalledWith('file-mp-9', { $set: expect.objectContaining({ status: 'UPLOADED', size: 12345 }) }, { new: true });
    expect(UsageRecord.findOneAndUpdate).toHaveBeenCalledWith(expect.anything(), { $inc: { storageUsed: 12345, uploads: 1 } }, expect.anything());
  });

  it('rejects an assembled object over the route limit: deletes it and counts nothing', async () => {
    head({ ContentLength: 9_000_000, ContentType: 'video/mp4' });
    vi.mocked(FileRouter.findOne).mockResolvedValue({ maxFileSize: 8_000_000, allowedTypes: [] } as any);
    const res = await call();
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('FILE_TOO_LARGE');
    expect(vi.mocked(r2Client.send).mock.calls.some(([command]) => command instanceof DeleteObjectCommand)).toBe(true);
    expect(File.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'file-mp-9', status: 'UPLOADING' }, { $set: expect.objectContaining({ status: 'DELETED' }) });
    expect(File.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(UsageRecord.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/upload/multipart/abort', () => {
  const fakeUploadingFile = {
    _id: 'file-mp-3',
    key: 'proj-mp/videos/xyz/video.mp4',
    name: 'video.mp4',
    size: MULTIPART_FILE_SIZE,
    type: 'video/mp4',
    status: 'UPLOADING',
    uploadId: 'upload-id-to-abort',
    projectId: 'proj-mp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(fakeUploadingFile as any);
    vi.mocked(File.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);
    vi.mocked(r2Client.send).mockResolvedValue({} as any);
  });

  it('abort deletes the multipart upload and file record', async () => {
    const req = makePost('http://localhost/api/v1/upload/multipart/abort', {
      fileId: 'file-mp-3',
      uploadId: 'upload-id-to-abort',
    });
    const res = await abortPOST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // AbortMultipartUploadCommand sent to R2
    expect(r2Client.send).toHaveBeenCalled();
    // File record deleted from DB
    expect(File.deleteOne).toHaveBeenCalledWith({ _id: 'file-mp-3' });
  });
});
