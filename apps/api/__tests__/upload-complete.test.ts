import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Lock contention is covered by audit-quota.test.ts; retain route assertions here.
const lock = vi.hoisted(() => ({ held: false }));
vi.mock('@/lib/user-quota', () => ({
  withUserQuotaLock: async (_userId: unknown, work: () => Promise<unknown>) => {
    lock.held = true;
    try { return await work(); } finally { lock.held = false; }
  },
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
import { enqueueWebhook } from '@/lib/qstash';
import { sendMeterEvent } from '@/lib/stripe-meters';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { TIER_LIMITS } from '@uploadkitdev/shared';

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

  it('does not fail a completed upload when webhook queue admission rejects', async () => {
    vi.mocked(FileRouter.findOne).mockResolvedValue({ webhookUrl: 'https://example.com/webhook' } as any);
    vi.mocked(enqueueWebhook).mockRejectedValueOnce(new Error('queue failure'));
    const req = makePostRequest({ fileId: fakeUploadingFile._id });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(enqueueWebhook).toHaveBeenCalledWith('https://example.com/webhook', expect.anything(), {
      projectId: fakeProject._id, fileId: fakeUploadingFile._id, routeSlug: 'images',
    });
  });

  it('enqueues the webhook (awaited) only after the quota lock is released', async () => {
    vi.mocked(FileRouter.findOne).mockResolvedValue({ webhookUrl: 'https://example.com/webhook' } as any);
    let heldDuringEnqueue: boolean | undefined;
    let settled = false;
    vi.mocked(enqueueWebhook).mockImplementationOnce(async () => {
      heldDuringEnqueue = lock.held;
      await new Promise((resolve) => setTimeout(resolve, 5));
      settled = true;
    });
    const res = await POST(makePostRequest({ fileId: fakeUploadingFile._id }), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(heldDuringEnqueue).toBe(false);
    expect(settled).toBe(true);
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

describe('POST /api/v1/upload/complete real stored object', () => {
  function head(meta: { ContentLength?: number; ContentType?: string }) {
    vi.mocked(r2Client.send).mockImplementation((async (command: unknown) => (command instanceof HeadObjectCommand ? meta : {})) as any);
  }
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(File.findOne).mockResolvedValue(fakeUploadingFile as any);
    vi.mocked(File.findByIdAndUpdate).mockImplementation((async (_id: unknown, update: any) => ({ ...fakeUploadingFile, ...update.$set })) as any);
    vi.mocked(File.findOneAndUpdate).mockResolvedValue({ ...fakeUploadingFile, status: 'DELETED' } as any);
    vi.mocked(UsageRecord.findOneAndUpdate).mockImplementation((async (_f: unknown, update: any) => ({ storageUsed: update.$inc.storageUsed, uploads: 1 })) as any);
    vi.mocked(FileRouter.findOne).mockResolvedValue(null);
  });

  it('records the real stored size (not the declared one) in the file, usage and Stripe meters', async () => {
    head({ ContentLength: 1024, ContentType: 'image/jpeg' });
    vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'PRO', stripeCustomerId: 'cus_1', status: 'ACTIVE' } as any);
    const res = await POST(makePostRequest({ fileId: fakeUploadingFile._id }), { params: Promise.resolve({}) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.file.size).toBe(1024);
    expect(body.file.status).toBe('UPLOADED');
    expect(File.findByIdAndUpdate).toHaveBeenCalledWith(fakeUploadingFile._id, { $set: expect.objectContaining({ status: 'UPLOADED', size: 1024 }) }, { new: true });
    expect(UsageRecord.findOneAndUpdate).toHaveBeenCalledWith(expect.anything(), { $inc: { storageUsed: 1024, uploads: 1 } }, expect.anything());
    expect(sendMeterEvent).toHaveBeenCalledWith('storage', 1024, 'cus_1', `storage_${fakeUploadingFile._id}`);
  });

  it('rejects an object larger than the route limit: deletes it, marks the file deleted, counts nothing', async () => {
    head({ ContentLength: 5000, ContentType: 'image/jpeg' });
    vi.mocked(FileRouter.findOne).mockResolvedValue({ maxFileSize: 4096, allowedTypes: [], webhookUrl: 'https://example.com/hook' } as any);
    const res = await POST(makePostRequest({ fileId: fakeUploadingFile._id }), { params: Promise.resolve({}) });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('FILE_TOO_LARGE');
    expect(vi.mocked(r2Client.send).mock.calls.some(([command]) => command instanceof DeleteObjectCommand && (command as any).input.Key === fakeUploadingFile.key)).toBe(true);
    expect(File.findOneAndUpdate).toHaveBeenCalledWith({ _id: fakeUploadingFile._id, status: 'UPLOADING' }, { $set: expect.objectContaining({ status: 'DELETED' }) });
    expect(File.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(UsageRecord.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sendMeterEvent).not.toHaveBeenCalled();
    expect(enqueueWebhook).not.toHaveBeenCalled();
  });

  it('rejects an object larger than the tier limit even when the route allows more', async () => {
    head({ ContentLength: TIER_LIMITS.FREE.maxFileSizeBytes + 1 });
    vi.mocked(FileRouter.findOne).mockResolvedValue({ maxFileSize: Number.MAX_SAFE_INTEGER, allowedTypes: [] } as any);
    const res = await POST(makePostRequest({ fileId: fakeUploadingFile._id }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('FILE_TOO_LARGE');
    expect(UsageRecord.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an object whose stored content type is not allowed by the route', async () => {
    head({ ContentLength: 1024, ContentType: 'application/x-msdownload' });
    vi.mocked(FileRouter.findOne).mockResolvedValue({ maxFileSize: 4096, allowedTypes: ['image/*'] } as any);
    const res = await POST(makePostRequest({ fileId: fakeUploadingFile._id }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(UsageRecord.findOneAndUpdate).not.toHaveBeenCalled();
    expect(File.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
