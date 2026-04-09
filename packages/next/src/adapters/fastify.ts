import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

/**
 * createFastifyHandler — adapts createUploadKitHandler for Fastify.
 *
 * Register like:
 * ```ts
 * import { createFastifyHandler } from '@uploadkitdev/next/fastify';
 * fastify.all('/api/uploadkit/*', createFastifyHandler({ router, apiKey }));
 * ```
 *
 * req.params['*'] should contain the wildcard segment(s).
 */
export function createFastifyHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
    const url = `${req.protocol}://${req.hostname}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === 'string') headers.set(key, val);
      else if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const webReq = new Request(url, {
      method: req.method,
      headers,
      ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
    });

    const segments = (req.params['*'] ?? '').split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    const webRes = req.method === 'GET'
      ? await handler.GET(webReq, routeParams)
      : await handler.POST(webReq, routeParams);

    const body = await webRes.text();
    return reply
      .status(webRes.status)
      .headers(Object.fromEntries(webRes.headers.entries()))
      .send(body);
  };
}
