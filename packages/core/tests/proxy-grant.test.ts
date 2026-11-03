import { afterEach, expect, it, vi } from 'vitest';
import { ProxyUploadKitClient } from '../src/proxy-client';
afterEach(() => vi.unstubAllGlobals());
it('fails closed with an old BYOS server that does not issue grants', async () => {
  const xhr = vi.fn(); vi.stubGlobal('XMLHttpRequest', xhr);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ uploadUrl: 'https://storage.test', key: 'k' })));
  await expect(new ProxyUploadKitClient({ endpoint: '/api/uploadkit' }).upload({ file: new File(['a'], 'a'), route: 'media' })).rejects.toMatchObject({ code: 'UPLOAD_GRANT_REQUIRED' });
  expect(xhr).not.toHaveBeenCalled();
});
it('forwards the BYOS grant unchanged and returns the server-authoritative file', async () => {
  class Xhr {
    upload = {}; status = 200; onload?: () => void;
    open() {} setRequestHeader() {} send() { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal('XMLHttpRequest', Xhr);
  const file = { id: 'media/id/photo.png', key: 'media/id/photo.png', name: 'photo.png', size: 3, type: 'image/png', url: 'https://storage.test/server-signed', status: 'uploaded', createdAt: '2026-01-01T00:00:00Z' };
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ uploadUrl: 'https://storage.test/put', key: file.key, uploadToken: 'signed-grant' })).mockResolvedValueOnce(Response.json({ file }));
  vi.stubGlobal('fetch', fetch);
  const result = await new ProxyUploadKitClient({ endpoint: '/api/uploadkit' }).upload({ file: new File(['abc'], 'photo.png', { type: 'image/png' }), route: 'media' });
  const sent = JSON.parse(fetch.mock.calls[1]![1].body);
  expect(sent).toEqual({ action: 'upload-complete', key: file.key, uploadToken: 'signed-grant' });
  expect(result).toEqual(file);
});
it('reads route config (maxFileCount) from the handler GET and caches it', async () => {
  const fetch = vi.fn().mockImplementation(async () => Response.json({ maxFileCount: 2 }));
  vi.stubGlobal('fetch', fetch);
  const client = new ProxyUploadKitClient({ endpoint: '/api/uploadkit/' });
  expect(await client.getRouteConfig('media')).toEqual({ maxFileCount: 2 });
  await client.getRouteConfig('media');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]![0]).toBe('/api/uploadkit/media');
});
it('treats an unreachable or old route config endpoint as no limit', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));
  expect(await new ProxyUploadKitClient({ endpoint: '/api/uploadkit' }).getRouteConfig('media')).toEqual({});
});
