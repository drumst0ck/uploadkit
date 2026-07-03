import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyCdnValidationRecords,
  CloudflareDnsConflictError,
} from '../src/oauth-dns';

function cfResponse(result: unknown): Response {
  return new Response(JSON.stringify({ success: true, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('applyCdnValidationRecords', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not overwrite a conflicting CNAME', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(cfResponse([{ id: 'zone-1', name: 'acme.com' }]))
      .mockResolvedValueOnce(cfResponse([{
        id: 'record-1',
        type: 'CNAME',
        name: 'cdn.acme.com',
        content: 'old.example.com',
        proxied: true,
      }]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(applyCdnValidationRecords('token', 'cdn.acme.com', [{
      type: 'cname',
      name: 'cdn.acme.com',
      value: 'cname.uploadkit.dev',
    }])).rejects.toBeInstanceOf(CloudflareDnsConflictError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is idempotent when the desired CNAME already exists', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(cfResponse([{ id: 'zone-1', name: 'acme.com' }]))
      .mockResolvedValueOnce(cfResponse([{
        id: 'record-1',
        type: 'CNAME',
        name: 'cdn.acme.com',
        content: 'cname.uploadkit.dev.',
        proxied: true,
      }]));
    vi.stubGlobal('fetch', fetchMock);

    await applyCdnValidationRecords('token', 'cdn.acme.com', [{
      type: 'cname',
      name: 'cdn.acme.com',
      value: 'cname.uploadkit.dev',
    }]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('adds a TXT value without replacing other TXT records at the same name', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(cfResponse([{ id: 'zone-1', name: 'acme.com' }]))
      .mockResolvedValueOnce(cfResponse([{
        id: 'record-1',
        type: 'TXT',
        name: '_acme-challenge.cdn.acme.com',
        content: 'another-validation-token',
      }]))
      .mockResolvedValueOnce(cfResponse({ id: 'record-2' }));
    vi.stubGlobal('fetch', fetchMock);

    await applyCdnValidationRecords('token', 'cdn.acme.com', [{
      type: 'txt',
      name: '_acme-challenge.cdn.acme.com',
      value: 'uploadkit-validation-token',
    }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'POST' });
  });
});
