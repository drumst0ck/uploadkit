import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock all external dependencies before importing route handlers
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
  },
  FileRouter: {
    findOne: vi.fn(),
  },
  UsageRecord: {
    findOne: vi.fn(),
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

vi.mock('@/lib/presign', () => ({
  generatePresignedPutUrl: vi.fn(),
}));

import { POST } from '@/app/api/v1/upload/request/route';
import { ApiKey, Subscription, File, FileRouter, UsageRecord } from '@uploadkitdev/db';
import { uploadRatelimit } from '@/lib/rate-limit';
import { generatePresignedPutUrl } from '@/lib/presign';

const fakeProject = {
  _id: 'proj-upload',
  userId: 'user-upload',
  name: 'Upload Project',
};
const fakeApiKeyDoc = {
  _id: 'key-upload',
  projectId: fakeProject,
  keyHash: 'hash',
  revokedAt: null,
};
const fakeFileRouter = {
  _id: 'router-1',
  slug: 'images',
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  allowedTypes: ['image/jpeg', 'image/png'],
  projectId: 'proj-upload',
};
const fakeFile = {
  _id: 'file-new-1',
  key: 'proj-upload/images/abc123/photo.jpg',
  name: 'photo.jpg',
  size: 1024,
  type: 'image/jpeg',
  url: 'https://cdn.uploadkit.dev/proj-upload/images/abc123/photo.jpg',
  status: 'UPLOADING',
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
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/v1/upload/request', {
    method: 'POST',
    headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/upload/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(FileRouter.findOne).mockResolvedValue(fakeFileRouter as any);
    vi.mocked(UsageRecord.findOne).mockResolvedValue(null); // no prior usage
    vi.mocked(File.create).mockResolvedValue(fakeFile as any);
    vi.mocked(generatePresignedPutUrl).mockResolvedValue('https://r2.example.com/presigned-url');
  });

  it('returns presigned URL and file record on valid request', async () => {
    const req = makePostRequest({
      fileName: 'photo.jpg',
      fileSize: 1024,
      contentType: 'image/jpeg',
      routeSlug: 'images',
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe('https://r2.example.com/presigned-url');
    expect(body.fileId).toBe('file-new-1');
    expect(body.key).toBeDefined();
  });

  it('returns 400 on invalid body (missing fileName)', async () => {
    const req = makePostRequest({
      fileSize: 1024,
      contentType: 'image/jpeg',
      routeSlug: 'images',
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when file exceeds route maxFileSize', async () => {
    // FREE tier maxFileSizeBytes is 4 MB; route allows 10 MB
    // effectiveMaxSize = Math.min(10MB, 4MB) = 4MB
    // Send a 5 MB file — should fail
    const req = makePostRequest({
      fileName: 'large.jpg',
      fileSize: 5 * 1024 * 1024, // 5 MB — exceeds FREE tier's 4 MB
      contentType: 'image/jpeg',
      routeSlug: 'images',
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('TIER_LIMIT_EXCEEDED');
  });

  it('returns 400 when file type not in allowedTypes', async () => {
    const req = makePostRequest({
      fileName: 'document.pdf',
      fileSize: 1024,
      contentType: 'application/pdf', // not in ['image/jpeg', 'image/png']
      routeSlug: 'images',
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_FILE_TYPE');
  });
});
