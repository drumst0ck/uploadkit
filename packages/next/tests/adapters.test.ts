import { afterEach, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createHonoHandler } from '../src/adapters/hono';
import { createExpressHandler } from '../src/adapters/express';
import type { Request, Response as ExpressResponse, NextFunction } from 'express';
afterEach(() => vi.unstubAllGlobals());

it.each(['/api/uploadkit', '/custom/uploads'])('Hono preserves the slug before upload-complete at %s', async prefix => {
  const middleware = vi.fn().mockResolvedValue({ userId: 'u' });
  const fetch = vi.fn().mockResolvedValue(Response.json({ file: { url: 'https://cdn.test/file' } }));
  vi.stubGlobal('fetch', fetch);
  const app = new Hono();
  app.all(`${prefix}/*`, createHonoHandler({ router: { media: { middleware } }, apiKey: 'test' }));
  const res = await app.request(`${prefix}/media/upload-complete`, { method: 'POST', body: JSON.stringify({ action: 'upload-complete', fileId: 'f' }) });
  expect(res.status).toBe(200);
  expect(middleware).toHaveBeenCalledOnce();
});

function expressRequest(body: unknown) {
  return { protocol: 'https', method: 'POST', get: () => 'app.test', originalUrl: '/api/uploadkit/media',
    headers: { 'content-type': 'application/json', 'content-length': '999', 'transfer-encoding': 'chunked' },
    params: { path: 'media' }, body,
  } as unknown as Request;
}
function expressResponse() {
  const res = { status: vi.fn(), setHeader: vi.fn(), send: vi.fn() };
  return res as unknown as ExpressResponse;
}
it('Express reports the missing JSON body parser clearly', async () => {
  const handler = createExpressHandler({ router: { media: {} }, apiKey: 'test' });
  const res = expressResponse();
  await handler(expressRequest(undefined), res, vi.fn() as NextFunction);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('express.json()'));
});
it('Express removes stale framing headers when serializing parsed JSON', async () => {
  const middleware = vi.fn(async ({ req }: { req: globalThis.Request }) => {
    expect(req.headers.has('content-length')).toBe(false);
    expect(req.headers.has('transfer-encoding')).toBe(false);
    return {};
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ uploadUrl: 'u', key: 'k', fileId: 'f' })));
  const handler = createExpressHandler({ router: { media: { middleware } }, apiKey: 'test' });
  const res = expressResponse();
  await handler(expressRequest({ action: 'request-upload', contentType: 'image/png', contentLength: 1 }), res, vi.fn() as NextFunction);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(middleware).toHaveBeenCalledOnce();
});
