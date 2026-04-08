import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only is a no-op in tests — mock it
vi.mock('server-only', () => ({}));

import { createUploadKitHandler } from '../src/handler';
import type { FileRouter } from '../src/types';

// Type-level test: satisfies FileRouter preserves literal keys
const testRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 1,
    allowedTypes: ['image/jpeg', 'image/png'],
  },
  documentUploader: {
    maxFileSize: '16MB',
    maxFileCount: 5,
  },
} satisfies FileRouter;

// Compile-time assertion: literal keys are preserved
const _typeCheck: 'imageUploader' = '' as keyof typeof testRouter;
void _typeCheck;

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

function makeParams(slug: string): { params: Promise<{ uploadkit: string[] }> } {
  return { params: Promise.resolve({ uploadkit: [slug] }) };
}

describe('createUploadKitHandler', () => {
  it('returns an object with GET and POST properties', () => {
    const handler = createUploadKitHandler({ router: testRouter });
    expect(typeof handler.GET).toBe('function');
    expect(typeof handler.POST).toBe('function');
  });

  describe('GET handler', () => {
    it('returns route config JSON for a known slug', async () => {
      const handler = createUploadKitHandler({ router: testRouter });
      const req = makeRequest('GET', 'http://localhost/api/uploadkit/imageUploader');
      const ctx = makeParams('imageUploader');

      const res = await handler.GET(req, ctx);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        maxFileSize: 4194304,
        maxFileCount: 1,
        allowedTypes: ['image/jpeg', 'image/png'],
      });
    });

    it('returns 404 for unknown slug', async () => {
      const handler = createUploadKitHandler({ router: testRouter });
      const req = makeRequest('GET', 'http://localhost/api/uploadkit/unknownRoute');
      const ctx = makeParams('unknownRoute');

      const res = await handler.GET(req, ctx);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('POST handler', () => {
    it('calls middleware and passes its result to onUploadComplete', async () => {
      const middleware = vi.fn().mockResolvedValue({ userId: 'user-123' });
      const onUploadComplete = vi.fn().mockResolvedValue(undefined);

      const router = {
        imageUploader: {
          maxFileSize: '4MB',
          middleware,
          onUploadComplete,
        },
      } satisfies FileRouter;

      const handler = createUploadKitHandler({ router });
      const mockFile = {
        id: 'file-1',
        key: 'images/test.jpg',
        name: 'test.jpg',
        size: 100000,
        type: 'image/jpeg',
        url: 'https://cdn.example.com/test.jpg',
      };

      const req = makeRequest('POST', 'http://localhost/api/uploadkit/imageUploader', {
        action: 'upload-complete',
        file: mockFile,
      });
      const ctx = makeParams('imageUploader');

      const res = await handler.POST(req, ctx);
      expect(res.status).toBe(200);

      expect(middleware).toHaveBeenCalledOnce();
      expect(middleware).toHaveBeenCalledWith({ req });

      expect(onUploadComplete).toHaveBeenCalledOnce();
      expect(onUploadComplete).toHaveBeenCalledWith({
        file: mockFile,
        metadata: { userId: 'user-123' },
      });

      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('returns 404 for unknown slug in POST', async () => {
      const handler = createUploadKitHandler({ router: testRouter });
      const req = makeRequest('POST', 'http://localhost/api/uploadkit/noRoute', {
        action: 'upload-complete',
        file: {},
      });
      const ctx = makeParams('noRoute');

      const res = await handler.POST(req, ctx);
      expect(res.status).toBe(404);
    });

    it('handles missing middleware gracefully (metadata defaults to {})', async () => {
      const onUploadComplete = vi.fn().mockResolvedValue(undefined);

      const router = {
        plainRoute: {
          maxFileSize: '8MB',
          onUploadComplete,
        },
      } satisfies FileRouter;

      const handler = createUploadKitHandler({ router });
      const req = makeRequest('POST', 'http://localhost/api/uploadkit/plainRoute', {
        action: 'upload-complete',
        file: { id: 'f1', key: 'k1', name: 'f.jpg', size: 100, type: 'image/jpeg', url: 'https://cdn.test/k1' },
      });
      const ctx = makeParams('plainRoute');

      const res = await handler.POST(req, ctx);
      expect(res.status).toBe(200);
      expect(onUploadComplete).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      );
    });
  });
});
