import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only so it doesn't throw in test environment
vi.mock('server-only', () => ({}));

// Mock AWS SDK modules — S3Client must be a class (constructor)
vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn(function (this: Record<string, unknown>, config: unknown) {
    this._config = config;
  });
  const PutObjectCommand = vi.fn(function (this: Record<string, unknown>, params: unknown) {
    this._params = params;
  });
  return { S3Client, PutObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url?sig=abc'),
}));

import { createByosClient, generateByosPresignedUrl } from '../src/byos';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Client as S3ClientType } from '@aws-sdk/client-s3';

const MockS3Client = vi.mocked(S3Client);
const MockPutObjectCommand = vi.mocked(PutObjectCommand);
const mockGetSignedUrl = vi.mocked(getSignedUrl);

const storageConfig = {
  region: 'auto',
  endpoint: 'https://abc123.r2.cloudflarestorage.com',
  accessKeyId: 'test-key-id',
  secretAccessKey: 'test-secret-key',
  bucket: 'my-bucket',
};

describe('createByosClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an S3Client with the given region and credentials', () => {
    createByosClient(storageConfig);

    expect(MockS3Client).toHaveBeenCalledOnce();
    expect(MockS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'auto',
        credentials: {
          accessKeyId: 'test-key-id',
          secretAccessKey: 'test-secret-key',
        },
        forcePathStyle: true,
      })
    );
  });

  it('passes endpoint when provided (R2 custom endpoint)', () => {
    createByosClient(storageConfig);

    expect(MockS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
      })
    );
  });

  it('does not pass endpoint when not provided', () => {
    const { endpoint: _e, ...configWithoutEndpoint } = storageConfig;
    createByosClient(configWithoutEndpoint);

    const callArg = MockS3Client.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('endpoint');
  });
});

describe('generateByosPresignedUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getSignedUrl with a PutObjectCommand', async () => {
    const client = createByosClient(storageConfig);
    const url = await generateByosPresignedUrl(client as unknown as S3ClientType, {
      bucket: 'my-bucket',
      key: 'uploads/test.jpg',
      contentType: 'image/jpeg',
      contentLength: 204800,
    });

    expect(MockPutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'my-bucket',
      Key: 'uploads/test.jpg',
      ContentType: 'image/jpeg',
      ContentLength: 204800,
    });

    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    expect(url).toBe('https://s3.example.com/presigned-url?sig=abc');
  });

  it('uses default expiresIn of 900 seconds', async () => {
    const client = createByosClient(storageConfig);
    await generateByosPresignedUrl(client as unknown as S3ClientType, {
      bucket: 'my-bucket',
      key: 'uploads/doc.pdf',
      contentType: 'application/pdf',
      contentLength: 1024,
    });

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });

  it('respects custom expiresIn', async () => {
    const client = createByosClient(storageConfig);
    await generateByosPresignedUrl(client as unknown as S3ClientType, {
      bucket: 'my-bucket',
      key: 'uploads/video.mp4',
      contentType: 'video/mp4',
      contentLength: 10485760,
      expiresIn: 1800,
    });

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 1800 })
    );
  });
});

describe('handler BYOS integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses BYOS path when storage config is provided', async () => {
    const { createUploadKitHandler } = await import('../src/handler');

    const router = {
      imageUploader: {
        maxFileSize: '4MB',
        allowedTypes: ['image/jpeg'],
      },
    };

    const handler = createUploadKitHandler({
      router,
      storage: storageConfig,
    });

    const req = new Request('http://localhost/api/uploadkit/imageUploader', {
      method: 'POST',
      body: JSON.stringify({
        action: 'request-upload',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        contentLength: 204800,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const ctx = { params: Promise.resolve({ uploadkit: ['imageUploader'] }) };
    const res = await handler.POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('uploadUrl');
    expect(json).toHaveProperty('key');
    expect(json.uploadUrl).toBe('https://s3.example.com/presigned-url?sig=abc');
  });
});
