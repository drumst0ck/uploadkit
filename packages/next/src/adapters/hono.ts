import type { Context } from 'hono';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

/**
 * createHonoHandler — adapts createUploadKitHandler for Hono.
 *
 * Register like:
 * ```ts
 * import { createHonoHandler } from '@uploadkitdev/next/hono';
 * app.all('/api/uploadkit/*', createHonoHandler({ router, apiKey }));
 * ```
 *
 * Hono uses Web Request/Response natively — minimal bridging needed.
 */
export function createHonoHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (c: Context) => {
    // Hono uses Web Request/Response natively — minimal bridging needed
    const segments = (c.req.param('path') ?? c.req.path.split('/').slice(-1)[0] ?? '')
      .split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    return c.req.method === 'GET'
      ? handler.GET(c.req.raw, routeParams)
      : handler.POST(c.req.raw, routeParams);
  };
}
