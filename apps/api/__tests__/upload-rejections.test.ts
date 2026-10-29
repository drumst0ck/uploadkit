import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: { findOne: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) },
  Subscription: { findOne: vi.fn() },
  File: { create: vi.fn() },
  FileRouter: { findOne: vi.fn() },
  UsageRecord: { findOne: vi.fn() },
  UploadRejection: { create: vi.fn(), countDocuments: vi.fn() },
}));
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn() },
  uploadRatelimit: { limit: vi.fn() },
}));
vi.mock('@/lib/storage', () => ({
  r2Client: { send: vi.fn().mockResolvedValue({ UploadId: 'u1' }) },
  R2_BUCKET: 'b',
  CDN_URL: 'https://cdn.test',
}));
vi.mock('@/lib/presign', () => ({ generatePresignedPutUrl: vi.fn().mockResolvedValue('https://r2/put') }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn().mockResolvedValue('https://r2/part') }));

import { POST as requestPOST } from '@/app/api/v1/upload/request/route';
import { POST as initPOST } from '@/app/api/v1/upload/multipart/init/route';
import { ApiKey, Subscription, File, FileRouter, UsageRecord, UploadRejection } from '@uploadkitdev/db';
import { uploadRatelimit } from '@/lib/rate-limit';

const MB = 1024 * 1024;
const project = { _id: 'proj-1', userId: 'user-1', name: 'P' };
const router = (over: object = {}) => ({ slug: 'avatars', maxFileSize: 2 * MB, allowedTypes: ['image/png'], projectId: 'proj-1', ...over });

function auth(tier: 'FREE' | 'PRO' = 'FREE') {
  vi.mocked(uploadRatelimit.limit).mockResolvedValue({ success: true, reset: Date.now() + 60000 } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue({ _id: 'k', projectId: project, revokedAt: null }),
  } as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier } as any);
}
function post(url: string, body: object, token = 'Bearer uk_live_x') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { authorization: token, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const REQ = 'http://localhost/api/v1/upload/request';
const INIT = 'http://localhost/api/v1/upload/multipart/init';
const ctxArg = { params: Promise.resolve({}) };
const base = { fileName: 'cat.png', fileSize: 1 * MB, contentType: 'image/png', routeSlug: 'avatars' };

async function snap(res: Response) {
  return { status: res.status, body: await res.json() };
}
const created = (): any[] => (UploadRejection.create as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c[0]);

describe('upload rejections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth();
    vi.mocked(FileRouter.findOne).mockResolvedValue(router() as any);
    vi.mocked(UsageRecord.findOne).mockResolvedValue(null);
    vi.mocked(UploadRejection.countDocuments).mockResolvedValue(0 as any);
    vi.mocked(UploadRejection.create).mockResolvedValue({} as any);
    vi.mocked(File.create).mockResolvedValue({ _id: 'f1', url: 'https://cdn.test/x' } as any);
  });

  describe('request route', () => {
    it('FILE_TOO_LARGE over router limit; response unchanged', async () => {
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(await snap(res)).toEqual({
        status: 403,
        body: { error: { type: 'invalid_request', code: 'TIER_LIMIT_EXCEEDED', message: 'You have exceeded your file size limit', suggestion: 'Upgrade your plan at app.uploadkit.dev/billing' } },
      });
      expect(created()).toEqual([
        expect.objectContaining({
          projectId: 'proj-1', userId: 'user-1', routerSlug: 'avatars', fileName: 'cat.png',
          fileSize: 3 * MB, fileType: 'image/png', code: 'FILE_TOO_LARGE', reason: 'Over 2 MB router limit',
        }),
      ]);
    });

    it('FILE_TOO_LARGE over plan limit names the plan', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 100 * MB }) as any);
      const res = await requestPOST(post(REQ, { ...base, fileSize: 5 * MB }), ctxArg);
      expect(res.status).toBe(403);
      expect(created()[0]).toMatchObject({ code: 'FILE_TOO_LARGE', reason: 'Over 4 MB Free limit' });
    });

    it('TYPE_NOT_ALLOWED; response unchanged', async () => {
      const res = await requestPOST(post(REQ, { ...base, contentType: 'application/pdf' }), ctxArg);
      expect(await snap(res)).toEqual({
        status: 400,
        body: { error: { type: 'invalid_request', code: 'INVALID_FILE_TYPE', message: "File type 'application/pdf' is not allowed. Allowed types: image/png" } },
      });
      expect(created()[0]).toMatchObject({ code: 'TYPE_NOT_ALLOWED', reason: 'Type not allowed by router', fileType: 'application/pdf' });
    });

    it('QUOTA_EXCEEDED storage (FREE); response unchanged', async () => {
      vi.mocked(UsageRecord.findOne).mockResolvedValue({ storageUsed: 5 * 1024 * MB, uploads: 0 } as any);
      const res = await requestPOST(post(REQ, base), ctxArg);
      expect(await snap(res)).toEqual({
        status: 403,
        body: { error: { type: 'invalid_request', code: 'TIER_LIMIT_EXCEEDED', message: 'You have exceeded your storage limit', suggestion: 'Upgrade your plan at app.uploadkit.dev/billing' } },
      });
      expect(created()[0]).toMatchObject({ code: 'QUOTA_EXCEEDED', reason: 'Storage quota reached on Free plan' });
    });

    it('QUOTA_EXCEEDED monthly uploads (FREE); response unchanged', async () => {
      vi.mocked(UsageRecord.findOne).mockResolvedValue({ storageUsed: 0, uploads: 1000 } as any);
      const res = await requestPOST(post(REQ, base), ctxArg);
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toBe('You have exceeded your monthly uploads limit');
      expect(created()[0]).toMatchObject({ code: 'QUOTA_EXCEEDED', reason: 'Monthly upload limit reached on Free plan' });
    });

    it('paid tier soft-limit pass-through writes nothing', async () => {
      auth('PRO');
      vi.mocked(UsageRecord.findOne).mockResolvedValue({ storageUsed: 0, uploads: 999999 } as any);
      const res = await requestPOST(post(REQ, base), ctxArg);
      expect(res.status).toBe(200);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });

    it('sanitizes and truncates fileName', async () => {
      const name = `../../${'a'.repeat(240)}\u0000.png`;
      await requestPOST(post(REQ, { ...base, fileName: name, fileSize: 3 * MB }), ctxArg);
      const n = created()[0].fileName as string;
      expect(n).toBe('a'.repeat(240) + '.png');
      expect(n.length).toBeLessThanOrEqual(255);
      expect(n).not.toMatch(/[\u0000-\u001f/\\]/);
    });

    it('unauthenticated request writes nothing', async () => {
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }, ''), ctxArg);
      expect(res.status).toBe(401);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });

    it('invalid API key writes nothing', async () => {
      vi.mocked(ApiKey.findOne).mockReturnValue({ populate: vi.fn().mockResolvedValue(null) } as any);
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(res.status).toBe(401);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });

    it('unknown router writes nothing', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(null as any);
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(res.status).toBe(404);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });

    it('DB write failure does not change the response', async () => {
      vi.mocked(UploadRejection.create).mockRejectedValue(new Error('mongo down'));
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(await snap(res)).toEqual({
        status: 403,
        body: { error: { type: 'invalid_request', code: 'TIER_LIMIT_EXCEEDED', message: 'You have exceeded your file size limit', suggestion: 'Upgrade your plan at app.uploadkit.dev/billing' } },
      });
      expect(UploadRejection.create).toHaveBeenCalled();
    });

    it('synchronous throw from the model does not change the response', async () => {
      vi.mocked(UploadRejection.countDocuments).mockImplementation(() => { throw new Error('boom'); });
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(res.status).toBe(403);
    });

    it('a hanging write does not hold the response', async () => {
      vi.mocked(UploadRejection.create).mockReturnValue(new Promise(() => {}) as any);
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(res.status).toBe(403);
    }, 5000);

    it('per-project rate cap: skips the write when too many recent rejections', async () => {
      vi.mocked(UploadRejection.countDocuments).mockResolvedValue(20 as any);
      const res = await requestPOST(post(REQ, { ...base, fileSize: 3 * MB }), ctxArg);
      expect(res.status).toBe(403);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });
  });

  describe('multipart init route', () => {
    const big = { ...base, fileName: 'v.mp4', contentType: 'video/mp4', fileSize: 20 * MB };
    beforeEach(() => auth('PRO'));

    it('FILE_TOO_LARGE over router limit; response unchanged', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 15 * MB, allowedTypes: [] }) as any);
      const res = await initPOST(post(INIT, big), ctxArg);
      expect(await snap(res)).toEqual({
        status: 403,
        body: { error: { type: 'invalid_request', code: 'TIER_LIMIT_EXCEEDED', message: 'You have exceeded your file size limit', suggestion: 'Upgrade your plan at app.uploadkit.dev/billing' } },
      });
      expect(created()[0]).toMatchObject({ code: 'FILE_TOO_LARGE', reason: 'Over 15 MB router limit', routerSlug: 'avatars' });
    });

    it('TYPE_NOT_ALLOWED; response unchanged', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 100 * MB }) as any);
      const res = await initPOST(post(INIT, big), ctxArg);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('INVALID_FILE_TYPE');
      expect(created()[0]).toMatchObject({ code: 'TYPE_NOT_ALLOWED', reason: 'Type not allowed by router' });
    });

    it('QUOTA_EXCEEDED storage; response unchanged', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 100 * MB, allowedTypes: [] }) as any);
      vi.mocked(UsageRecord.findOne).mockResolvedValue({ storageUsed: 100 * 1024 * MB, uploads: 0 } as any);
      const res = await initPOST(post(INIT, big), ctxArg);
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toBe('You have exceeded your storage limit');
      expect(created()[0]).toMatchObject({ code: 'QUOTA_EXCEEDED', reason: 'Storage quota reached on Pro plan' });
    });

    it('QUOTA_EXCEEDED monthly uploads; response unchanged', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 100 * MB, allowedTypes: [] }) as any);
      vi.mocked(UsageRecord.findOne).mockResolvedValue({ storageUsed: 0, uploads: 50000 } as any);
      const res = await initPOST(post(INIT, big), ctxArg);
      expect(res.status).toBe(403);
      expect(created()[0]).toMatchObject({ code: 'QUOTA_EXCEEDED', reason: 'Monthly upload limit reached on Pro plan' });
    });

    it('unauthenticated request writes nothing', async () => {
      const res = await initPOST(post(INIT, big, ''), ctxArg);
      expect(res.status).toBe(401);
      expect(UploadRejection.create).not.toHaveBeenCalled();
    });

    it('DB write failure does not change the response', async () => {
      vi.mocked(FileRouter.findOne).mockResolvedValue(router({ maxFileSize: 15 * MB, allowedTypes: [] }) as any);
      vi.mocked(UploadRejection.create).mockRejectedValue(new Error('down'));
      const res = await initPOST(post(INIT, big), ctxArg);
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe('TIER_LIMIT_EXCEEDED');
    });
  });
});
