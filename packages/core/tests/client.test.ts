import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUploadKit } from '../src/index';
import { UploadKitError } from '@uploadkit/shared';

// Mock the http module so no real network calls are made
vi.mock('../src/http', () => ({
  fetchApi: vi.fn(),
}));

// Mock the upload module to control single vs multipart routing
vi.mock('../src/upload', () => ({
  executeUpload: vi.fn(),
}));

import { fetchApi } from '../src/http';
import { executeUpload } from '../src/upload';

const mockFetchApi = vi.mocked(fetchApi);
const mockExecuteUpload = vi.mocked(executeUpload);

describe('createUploadKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns object with upload, listFiles, deleteFile methods', () => {
    const client = createUploadKit({ apiKey: 'uk_live_test123' });
    expect(typeof client.upload).toBe('function');
    expect(typeof client.listFiles).toBe('function');
    expect(typeof client.deleteFile).toBe('function');
  });

  it('throws UploadKitError if apiKey is missing', () => {
    expect(() => createUploadKit({ apiKey: '' })).toThrow(UploadKitError);
    let caught: unknown;
    try { createUploadKit({ apiKey: '' }); } catch (e) { caught = e; }
    expect(caught).toMatchObject({ code: 'MISSING_API_KEY' });
  });

  it('upload() delegates to executeUpload', async () => {
    const mockResult = {
      id: 'file-1',
      key: 'proj/route/id/test.jpg',
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg',
      url: 'https://cdn.uploadkit.dev/test.jpg',
      status: 'UPLOADED',
      createdAt: new Date().toISOString(),
    };
    mockExecuteUpload.mockResolvedValue(mockResult);

    const client = createUploadKit({ apiKey: 'uk_live_test123' });
    const file = new File(['hello'], 'test.jpg', { type: 'image/jpeg' });
    const result = await client.upload({ file, route: 'photos' });

    expect(mockExecuteUpload).toHaveBeenCalledOnce();
    expect(result).toEqual(mockResult);
  });

  it('upload() passes signal through for abort support', async () => {
    mockExecuteUpload.mockResolvedValue({
      id: 'f1', key: 'k', name: 'f', size: 1, type: 'text/plain',
      url: 'https://cdn.uploadkit.dev/f', status: 'UPLOADED', createdAt: '',
    });

    const controller = new AbortController();
    const client = createUploadKit({ apiKey: 'uk_live_test123' });
    const file = new File(['x'], 'f.txt', { type: 'text/plain' });

    await client.upload({ file, route: 'docs', signal: controller.signal });

    const callArgs = mockExecuteUpload.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs![1].signal).toBe(controller.signal);
  });

  it('listFiles() calls GET /api/v1/files and returns files + nextCursor', async () => {
    const mockResponse = {
      files: [
        { id: 'f1', key: 'k1', name: 'f1.jpg', size: 100, type: 'image/jpeg',
          url: 'https://cdn.uploadkit.dev/k1', status: 'UPLOADED', createdAt: '' },
      ],
      nextCursor: 'cursor-abc',
    };
    mockFetchApi.mockResolvedValue(mockResponse);

    const client = createUploadKit({ apiKey: 'uk_live_test123' });
    const result = await client.listFiles({ limit: 10 });

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.any(String),
      'uk_live_test123',
      '/api/v1/files?limit=10',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.files).toHaveLength(1);
    expect(result.nextCursor).toBe('cursor-abc');
  });

  it('deleteFile() calls DELETE /api/v1/files/:key and returns void', async () => {
    mockFetchApi.mockResolvedValue({ ok: true });

    const client = createUploadKit({ apiKey: 'uk_live_test123' });
    await client.deleteFile('proj/route/id/test.jpg');

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.any(String),
      'uk_live_test123',
      '/api/v1/files/proj%2Froute%2Fid%2Ftest.jpg',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
