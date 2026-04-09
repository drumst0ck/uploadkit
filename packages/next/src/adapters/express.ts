import type { Request as ExpressReq, Response as ExpressRes, NextFunction } from 'express';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

/**
 * createExpressHandler — adapts createUploadKitHandler for Express.
 *
 * Mount like:
 * ```ts
 * import { createExpressHandler } from '@uploadkit/next/express';
 * app.all('/api/uploadkit/*', createExpressHandler({ router, apiKey }));
 * ```
 *
 * req.params[0] should contain the route segment(s) after the wildcard.
 */
export function createExpressHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (req: ExpressReq, res: ExpressRes, _next: NextFunction) => {
    const url = `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`;
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

    // Extract route segments: Express route should be mounted like app.all('/api/uploadkit/*', handler)
    // req.params[0] contains everything after the wildcard
    const rawParam = req.params[0] ?? req.params['uploadkit'] ?? '';
    const paramStr = Array.isArray(rawParam) ? rawParam.join('/') : rawParam;
    const segments = paramStr.split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    const webRes = req.method === 'GET'
      ? await handler.GET(webReq, routeParams)
      : await handler.POST(webReq, routeParams);

    res.status(webRes.status);
    webRes.headers.forEach((value, key) => res.setHeader(key, value));
    const body = await webRes.text();
    res.setHeader('Content-Type', webRes.headers.get('Content-Type') ?? 'application/json');
    res.send(body);
  };
}
