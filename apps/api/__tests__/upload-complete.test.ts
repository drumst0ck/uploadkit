import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  FileRouter: {
    findOne: vi.fn(),
  },
  UsageRecord: {
    findOneAndUpdate: vi.fn(),
  },
  User: {
    findById: vi.fn(),
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

vi.mock('@/lib/qstash', () => ({
  enqueueWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/stripe-meters', () => ({
  sendMeterEvent: vi.fn().mockResolvedValue(undefined),
  METER_STORAGE: 'storage',
  METER_UPLOADS: 'uploads',
}));

vi.mock('@uploadkitdev/emails', () => ({
  sendUsageAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/v1/upload/complete/route';
import { ApiKey, Subscription, File, FileRouter, UsageRecord } from '@uploadkitdev/db';
import { uploadRatelimit } from '@/lib/rate-limit';
import { r2Client } from '@/lib/storage';

// Import S3ServiceException for simulating R2 errors
import { S3ServiceException } from '@aws-sdk/client-s3';

const fakeProject = { _id: 'proj-complete', userId: 'user-complete', name: 'Complete Project' };
const fakeApiKeyDoc = { _id: 'key-complete', projectId: fakeProject, keyHash: 'hash', revokedAt: null };
const fakeUploadingFile = {
  _id: 'file-uploading-1',
  key: 'proj-complete/images/abc/photo.jpg',
  name: 'photo.jpg',
  size: 2048,
  type: 'image/jpeg',
  url: 'https://cdn.uploadkit.dev/proj-complete/images/abc/photo.jpg',
  status: 'UPLOADING',
  projectId: 'proj-complete',
};
const fakeUploadedFile = { ...fakeUploadingFile, status: 'UPLOADED' };

function setupAuth() {
  vi.mocked(uploadRatelimit.limit).mockResolvedValue({
    success: true, limit: 30, remaining: 29, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(fakeApiKeyDoc),
  } as any);
  vi.mocked(ApiKey.updateOne).mockResolvedValue({} as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/v1/upload/complete', {
    method: 'POST',
    headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/upload/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(fakeUploadingFile as any);
    vi.mocked(File.findByIdAndUpdate).mockResolvedValue(fakeUploadedFile as any);
    vi.mocked(r2Client.send).mockResolvedValue({} as any); // HEAD succeeds
    vi.mocked(UsageRecord.findOneAndUpdate).mockResolvedValue({
      storageUsed: 2048,
      uploads: 1,
    } as any);
    vi.mocked(FileRouter.findOne).mockResolvedValue(null); // no webhook
  });

  it('marks file UPLOADED and returns file data on valid complete', async () => {
    const req = makePostRequest({ fileId: 'file-uploading-1' });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.file).toBeDefined();
    expect(body.file.status).toBe('UPLOADED');
    expect(File.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('returns 404 when file record not found', async () => {
    vi.mocked(File.findOne).mockResolvedValue(null);

    const req = makePostRequest({ fileId: 'nonexistent-file' });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when R2 HEAD fails (file not actually uploaded)', async () => {
    // Simulate R2 returning 404 for missing object
    const s3Error = new S3ServiceException({
      name: 'NoSuchKey',
      message: 'The specified key does not exist.',
      $fault: 'client',
      $metadata: { httpStatusCode: 404 },
    });
    Object.defineProperty(s3Error, '$response', { value: { statusCode: 404 } });
    vi.mocked(r2Client.send).mockRejectedValue(s3Error);

    const req = makePostRequest({ fileId: 'file-uploading-1' });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('FILE_NOT_IN_STORAGE');
  });
});
