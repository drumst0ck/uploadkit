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

import { multipartUpload } from '../src/multipart';
import { fetchApi } from '../src/http';

const mockFetchApi = vi.mocked(fetchApi);

const config = {
  apiKey: 'uk_live_test123',
  baseUrl: 'https://api.uploadkit.dev',
};

const PART_SIZE = 5 * 1024 * 1024; // 5MB — matches internal constant

function makeFile(sizeBytes: number, name = 'large.bin', type = 'application/octet-stream'): File {
  const buf = new Uint8Array(Math.min(sizeBytes, 10)).fill(0);
  const file = new File([buf], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

const mockUploadResult = {
  id: 'file-mp-1',
  key: 'proj/route/id/large.bin',
  name: 'large.bin',
  size: PART_SIZE * 2,
  type: 'application/octet-stream',
  url: 'https://cdn.uploadkit.dev/large.bin',
  status: 'UPLOADED',
  createdAt: new Date().toISOString(),
};

/**
 * XHR mock factory — creates a fake XHR instance.
 * Created fresh per-test via the global constructor mock.
 */
function makeXhrMock(etag = '"etag-1"') {
  return {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    onload: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    onabort: null as ((e: Event) => void) | null,
    status: 200,
    getResponseHeader: vi.fn().mockReturnValue(etag),
    triggerLoad(status = 200) {
      this.status = status;
      if (this.onload) this.onload(new Event('load'));
    },
    triggerError() {
      if (this.onerror) this.onerror(new Event('error'));
    },
  };
}

// Shared list of XHR instances created during a test; populated by the XHR factory
let xhrInstances: ReturnType<typeof makeXhrMock>[];

/**
 * Install a XMLHttpRequest global constructor that auto-triggers onload after creation.
 * `etagFn` returns the ETag header value for each instance (called with 1-based index).
 * `triggerFn` controls how the XHR behaves after being created (defaults to triggerLoad).
 */
function installXhrFactory(
  etagFn: (index: number) => string = (i) => `"etag-part-${i}"`,
  triggerFn: (instance: ReturnType<typeof makeXhrMock>) => void = (inst) => {
    setTimeout(() => inst.triggerLoad(200), 0);
  },
) {
  let callCount = 0;
  // Must use a regular function (not an arrow) so `new XHRFactory()` works as a constructor
  function XHRFactory(this: unknown) {
    const instance = makeXhrMock(etagFn(++callCount));
    xhrInstances.push(instance);
    triggerFn(instance);
    return instance;
  }
  vi.stubGlobal('XMLHttpRequest', XHRFactory);
}

describe('multipartUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrInstances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('splits a 12MB file into parts and uploads each one', async () => {
    const fileSize = 12 * 1024 * 1024; // 12MB → 2 parts (5MB + 7MB)
    const file = makeFile(fileSize);

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'mp-fid-1',
        uploadId: 'up-id-1',
        key: 'k',
        parts: [
          { partNumber: 1, uploadUrl: 'https://r2.example.com/part1' },
          { partNumber: 2, uploadUrl: 'https://r2.example.com/part2' },
        ],
      })
      .mockResolvedValueOnce({ file: mockUploadResult });

    installXhrFactory();

    const result = await multipartUpload(config, { file, route: 'videos' });

    // 2 XHR instances — one per part
    expect(xhrInstances).toHaveLength(2);
    expect(xhrInstances[0]!.open).toHaveBeenCalledWith('PUT', 'https://r2.example.com/part1');
    expect(xhrInstances[1]!.open).toHaveBeenCalledWith('PUT', 'https://r2.example.com/part2');
    expect(result).toEqual(mockUploadResult);
  });

  it('collects ETags from each part upload and passes them to multipart/complete', async () => {
    const fileSize = 12 * 1024 * 1024;
    const file = makeFile(fileSize);

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'mp-fid-2',
        uploadId: 'up-id-2',
        key: 'k',
        parts: [
          { partNumber: 1, uploadUrl: 'https://r2.example.com/part1' },
          { partNumber: 2, uploadUrl: 'https://r2.example.com/part2' },
        ],
      })
      .mockResolvedValueOnce({ file: mockUploadResult });

    installXhrFactory((i) => `"etag-part-${i}"`);

    await multipartUpload(config, { file, route: 'videos' });

    // multipart/complete called with uploadId and ETags
    const completeCall = mockFetchApi.mock.calls.find(([, , path]) =>
      (path as string).includes('complete'),
    );
    expect(completeCall).toBeDefined();
    const completeBody = completeCall![3] as { body: { parts: Array<{ partNumber: number; etag: string }> } };
    const parts = completeBody.body.parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ partNumber: 1, etag: '"etag-part-1"' });
    expect(parts[1]).toMatchObject({ partNumber: 2, etag: '"etag-part-2"' });
  });

  it('calls multipart/complete with uploadId on success', async () => {
    const file = makeFile(12 * 1024 * 1024);

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'mp-fid-3',
        uploadId: 'upload-id-xyz',
        key: 'k',
        parts: [
          { partNumber: 1, uploadUrl: 'https://r2.example.com/part1' },
          { partNumber: 2, uploadUrl: 'https://r2.example.com/part2' },
        ],
      })
      .mockResolvedValueOnce({ file: mockUploadResult });

    installXhrFactory(() => '"etag-ok"');

    await multipartUpload(config, { file, route: 'videos' });

    const completeCall = mockFetchApi.mock.calls.find(([, , path]) =>
      (path as string).includes('complete'),
    );
    const completeBody = (completeCall![3] as { body: { uploadId: string } }).body;
    expect(completeBody.uploadId).toBe('upload-id-xyz');
  });

  it('calls multipart/abort on part upload error and re-throws the original error', async () => {
    const file = makeFile(12 * 1024 * 1024);

    mockFetchApi
      .mockResolvedValueOnce({
        fileId: 'mp-fid-4',
        uploadId: 'up-id-4',
        key: 'k',
        parts: [
          { partNumber: 1, uploadUrl: 'https://r2.example.com/part1' },
          { partNumber: 2, uploadUrl: 'https://r2.example.com/part2' },
        ],
      })
      // abort call resolves successfully
      .mockResolvedValueOnce({});

    // All parts trigger an error (network failure)
    installXhrFactory(
      () => '"etag-ok"',
      (instance) => setTimeout(() => instance.triggerError(), 0),
    );

    await expect(
      multipartUpload(config, { file, route: 'videos' }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    // multipart/abort should have been called to clean up
    const abortCall = mockFetchApi.mock.calls.find(([, , path]) =>
      (path as string).includes('abort'),
    );
    expect(abortCall).toBeDefined();
    expect(abortCall![2]).toContain('abort');
  });
});
