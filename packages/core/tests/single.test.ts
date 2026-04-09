import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadKitError } from '@uploadkit/shared';

// Mock the http module so no real network calls are made
vi.mock('../src/http', () => ({
  fetchApi: vi.fn(),
}));

// Mock retry to be a pass-through so tests run synchronously
vi.mock('../src/retry', () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

import { singleUpload } from '../src/single';
import { fetchApi } from '../src/http';

const mockFetchApi = vi.mocked(fetchApi);

const config = {
  apiKey: 'uk_live_test123',
  baseUrl: 'https://api.uploadkit.dev',
};

function makeFile(name = 'test.jpg', type = 'image/jpeg', sizeBytes = 1024): File {
  const buf = new Uint8Array(Math.min(sizeBytes, 10)).fill(0);
  const file = new File([buf], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

const mockUploadResult = {
  id: 'file-1',
  key: 'proj/route/id/test.jpg',
  name: 'test.jpg',
  size: 1024,
  type: 'image/jpeg',
  url: 'https://cdn.uploadkit.dev/test.jpg',
  status: 'UPLOADED',
  createdAt: new Date().toISOString(),
};

/**
 * XHR mock factory — returns a fake XHR instance with controllable callbacks.
 * Call `triggerLoad(status)` to simulate a completed XHR request.
 * Call `triggerProgress(loaded, total)` to simulate upload progress.
 * Set `responseHeaders['ETag']` before triggerLoad to simulate ETag response.
 */
function createXhrMock() {
  const instance = {
    upload: { onprogress: null as ((e: ProgressEvent) => void) | null },
    onload: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    onabort: null as ((e: Event) => void) | null,
    status: 200,
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    getResponseHeader: vi.fn().mockReturnValue('"etag-abc"'),
    triggerLoad(status = 200) {
      this.status = status;
      if (this.onload) this.onload(new Event('load'));
    },
    triggerProgress(loaded: number, total: number) {
      if (this.upload.onprogress) {
        const event = Object.assign(new Event('progress'), {
          loaded,
          total,
          lengthComputable: true,
        }) as ProgressEvent;
        this.upload.onprogress(event);
      }
    },
    triggerError() {
      if (this.onerror) this.onerror(new Event('error'));
    },
    triggerAbort() {
      if (this.onabort) this.onabort(new Event('abort'));
    },
  };
  return instance;
}

describe('singleUpload', () => {
  let xhrInstance: ReturnType<typeof createXhrMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    xhrInstance = createXhrMock();
    // Replace the global XMLHttpRequest constructor — must use a regular function (not arrow)
    // so that `new XMLHttpRequest()` works correctly as a constructor call.
    const instance = xhrInstance;
    vi.stubGlobal('XMLHttpRequest', function XHRMock() { return instance; });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls POST /upload/request, PUTs to presigned URL, then POST /upload/complete', async () => {
    const file = makeFile();

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'fid-1',
        uploadUrl: 'https://r2.cloudflarestorage.com/presigned',
        key: 'proj/route/fid-1/test.jpg',
        cdnUrl: 'https://cdn.uploadkit.dev/test.jpg',
      })
      .mockResolvedValueOnce({ file: mockUploadResult });

    // Trigger XHR load asynchronously so singleUpload can set up callbacks
    setTimeout(() => xhrInstance.triggerLoad(200), 0);

    const result = await singleUpload(config, { file, route: 'photos' });

    // First fetchApi call: presign request
    expect(mockFetchApi).toHaveBeenCalledWith(
      config.baseUrl,
      config.apiKey,
      '/api/v1/upload/request',
      expect.objectContaining({ method: 'POST' }),
    );

    // Second fetchApi call: complete
    expect(mockFetchApi).toHaveBeenCalledWith(
      config.baseUrl,
      config.apiKey,
      '/api/v1/upload/complete',
      expect.objectContaining({ method: 'POST' }),
    );

    // XHR was opened with PUT to the presigned URL
    expect(xhrInstance.open).toHaveBeenCalledWith('PUT', 'https://r2.cloudflarestorage.com/presigned');
    expect(result).toEqual(mockUploadResult);
  });

  it('calls onProgress callback with 0-100 percentage during upload', async () => {
    const file = makeFile();
    const onProgress = vi.fn();

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'fid-2',
        uploadUrl: 'https://r2.cloudflarestorage.com/presigned2',
        key: 'k',
        cdnUrl: 'https://cdn.uploadkit.dev/test.jpg',
      })
      .mockResolvedValueOnce({ file: mockUploadResult });

    setTimeout(() => {
      xhrInstance.triggerProgress(512, 1024);
      xhrInstance.triggerLoad(200);
    }, 0);

    await singleUpload(config, { file, route: 'photos', onProgress });

    // Progress during XHR (50%) + 100% at completion
    const calls = onProgress.mock.calls.map(([p]) => p);
    expect(calls).toContain(50);
    expect(calls).toContain(100);
  });

  it('propagates abort signal to XHR abort', async () => {
    const file = makeFile();
    const controller = new AbortController();

    mockFetchApi.mockResolvedValueOnce({
      fileId: 'fid-3',
      uploadUrl: 'https://r2.cloudflarestorage.com/presigned3',
      key: 'k',
      cdnUrl: 'https://cdn.uploadkit.dev/test.jpg',
    });

    // Abort after XHR starts, simulate abort event
    setTimeout(() => {
      controller.abort();
      xhrInstance.triggerAbort();
    }, 0);

    await expect(
      singleUpload(config, { file, route: 'photos', signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'UPLOAD_ABORTED' });
  });

  it('throws UploadKitError on presign failure (non-2xx from fetchApi)', async () => {
    const file = makeFile();

    mockFetchApi.mockRejectedValueOnce(
      new UploadKitError('FORBIDDEN', 'Invalid API key', 403),
    );

    await expect(singleUpload(config, { file, route: 'photos' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // XHR should never have been opened
    expect(xhrInstance.open).not.toHaveBeenCalled();
  });
});
