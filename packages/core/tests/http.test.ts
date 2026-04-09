import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApi } from '../src/http';
import { UploadKitError } from '@uploadkit/shared';

describe('fetchApi', () => {
  const BASE_URL = 'https://api.uploadkit.dev';
  const API_KEY = 'uk_live_testkey123';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets Authorization header with Bearer + apiKey', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'ok' }),
    } as Response);

    await fetchApi(BASE_URL, API_KEY, '/api/v1/files');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, opts] = mockFetch.mock.calls[0]!;
    const headers = opts?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${API_KEY}`);
  });

  it('prepends baseUrl to path', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchApi(BASE_URL, API_KEY, '/api/v1/files');

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api.uploadkit.dev/api/v1/files');
  });

  it('throws UploadKitError on non-2xx response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
        }),
    } as Response);

    let caught: unknown;
    try {
      await fetchApi(BASE_URL, API_KEY, '/api/v1/files');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(UploadKitError);
    expect(caught).toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
  });

  it('parses JSON response body and returns typed data', async () => {
    const mockFetch = vi.mocked(fetch);
    const expectedData = { files: [{ id: 'f1', name: 'test.jpg' }], nextCursor: null };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expectedData),
    } as Response);

    const result = await fetchApi<typeof expectedData>(BASE_URL, API_KEY, '/api/v1/files');

    expect(result).toEqual(expectedData);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.name).toBe('test.jpg');
  });

  it('throws UploadKitError with INSECURE_URL for http:// baseUrl', async () => {
    let caught: unknown;
    try {
      await fetchApi('http://api.uploadkit.dev', API_KEY, '/api/v1/files');
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ code: 'INSECURE_URL' });
  });
});
