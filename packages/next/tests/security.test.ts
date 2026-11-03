import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUploadKitHandler } from '../src/handler';

const ctx = (slug = 'media') => ({ params: Promise.resolve({ uploadkit: [slug] }) });
const req = (body: unknown) => new Request('https://app.test/api/uploadkit/media', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
afterEach(() => vi.unstubAllGlobals());

describe('audit handler security', () => {
  it.each(['constructor', 'toString', '__proto__'])('rejects inherited slug %s for GET and POST', async (slug) => {
    const handler = createUploadKitHandler({ router: {}, apiKey: 'test' });
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await handler.GET(new Request('https://app.test'), ctx(slug))).status).toBe(404);
    expect((await handler.POST(req({ action: 'request-upload', contentLength: 1, contentType: 'image/png' }), ctx(slug))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {}, { contentType: 'image/png' }, { contentLength: 1 },
    { contentType: '', contentLength: 1 }, { contentType: 3, contentLength: 1 },
    { contentType: 'image/png', contentLength: -1 },
    { contentType: 'image/png', contentLength: '1' },
    { contentType: 'image/png', contentLength: 1.5 },
  ])('rejects missing or invalid upload attributes: %j', async (attributes) => {
    const handler = createUploadKitHandler({ router: { media: { maxFileSize: '4MB', allowedTypes: ['image/png'] } }, apiKey: 'test' });
    const fetch = vi.fn().mockResolvedValue(Response.json({ uploadUrl: 'https://storage.test', key: 'k', fileId: 'f' }));
    vi.stubGlobal('fetch', fetch);
    expect((await handler.POST(req({ action: 'request-upload', ...attributes }), ctx())).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('authenticates managed completion before contacting the API', async () => {
    const middleware = vi.fn().mockRejectedValue(new Error('secret auth detail'));
    const fetch = vi.fn().mockResolvedValue(Response.json({ file: { url: 'https://cdn.test/file' } }));
    vi.stubGlobal('fetch', fetch);
    const handler = createUploadKitHandler({ router: { media: { middleware } }, apiKey: 'test' });
    expect((await handler.POST(req({ action: 'upload-complete', fileId: 'f' }), ctx())).status).toBe(500);
    expect(middleware).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not expose internal exception messages in POST or GET', async () => {
    const handler = createUploadKitHandler({ router: { media: {
      middleware: async () => { throw new Error('secret bucket.internal'); }, maxFileSize: 'secret bucket.internal',
    } }, apiKey: 'test' });
    const post = await handler.POST(req({ action: 'request-upload' }), ctx());
    const get = await handler.GET(new Request('https://app.test'), ctx());
    for (const res of [post, get]) {
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: { code: 'HANDLER_ERROR', message: 'Internal server error' } });
    }
  });

  it('still forwards valid attributes and enforces size/type limits', async () => {
    const handler = createUploadKitHandler({ router: { media: { maxFileSize: 10, allowedTypes: ['image/png'] } }, apiKey: 'test' });
    const fetch = vi.fn().mockResolvedValue(Response.json({ uploadUrl: 'u', key: 'k', fileId: 'f' }));
    vi.stubGlobal('fetch', fetch);
    expect((await handler.POST(req({ action: 'request-upload', contentType: 'image/png', contentLength: 11 }), ctx())).status).toBe(413);
    expect((await handler.POST(req({ action: 'request-upload', contentType: 'text/plain', contentLength: 1 }), ctx())).status).toBe(415);
    expect((await handler.POST(req({ action: 'request-upload', contentType: 'image/png', contentLength: 0 }), ctx())).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
