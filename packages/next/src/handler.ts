import 'server-only';

import type { FileRouter, UploadKitHandlerConfig, UploadedFile } from './types';
import { parseFileSize, getRouteConfig } from './router';

type RouteParams = { params: Promise<{ uploadkit: string[] }> };

export function createUploadKitHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
): {
  GET: (req: Request, ctx: RouteParams) => Promise<Response>;
  POST: (req: Request, ctx: RouteParams) => Promise<Response>;
} {
  async function GET(req: Request, ctx: RouteParams): Promise<Response> {
    try {
      const params = await ctx.params;
      const slug = params.uploadkit[0];

      if (!slug) {
        return Response.json(
          { error: { code: 'ROUTE_NOT_FOUND', message: 'Unknown file route' } },
          { status: 404 }
        );
      }

      const route = getRouteConfig(config.router, slug);
      if (!route) {
        return Response.json(
          { error: { code: 'ROUTE_NOT_FOUND', message: 'Unknown file route' } },
          { status: 404 }
        );
      }

      return Response.json({
        maxFileSize: route.maxFileSize !== undefined
          ? parseFileSize(route.maxFileSize)
          : undefined,
        maxFileCount: route.maxFileCount,
        allowedTypes: route.allowedTypes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return Response.json(
        { error: { code: 'HANDLER_ERROR', message } },
        { status: 500 }
      );
    }
  }

  async function POST(req: Request, ctx: RouteParams): Promise<Response> {
    try {
      const params = await ctx.params;
      const slug = params.uploadkit[0];

      if (!slug) {
        return Response.json(
          { error: { code: 'ROUTE_NOT_FOUND', message: 'Unknown file route' } },
          { status: 404 }
        );
      }

      const route = getRouteConfig(config.router, slug);
      if (!route) {
        return Response.json(
          { error: { code: 'ROUTE_NOT_FOUND', message: 'Unknown file route' } },
          { status: 404 }
        );
      }

      const body = await req.json() as {
        action?: string;
        file?: UploadedFile;
        fileId?: string;
        fileName?: string;
        contentType?: string;
        contentLength?: number;
      };

      const { action } = body;

      // BYOS mode: generate presigned URL
      if (action === 'request-upload' && config.storage) {
        const { generateByosPresignedUrl, createByosClient } = await import('./byos');
        const { nanoid } = await import('nanoid');

        // Run middleware for auth/metadata
        const metadata = await route.middleware?.({ req }) ?? {};

        // Validate file against route config (T-04-09)
        if (route.maxFileSize !== undefined && body.contentLength !== undefined) {
          const maxBytes = parseFileSize(route.maxFileSize);
          if (body.contentLength > maxBytes) {
            return Response.json(
              { error: { code: 'FILE_TOO_LARGE', message: `File exceeds maximum size of ${route.maxFileSize}` } },
              { status: 413 }
            );
          }
        }

        if (route.allowedTypes && body.contentType) {
          if (!route.allowedTypes.includes(body.contentType)) {
            return Response.json(
              { error: { code: 'INVALID_FILE_TYPE', message: `File type "${body.contentType}" is not allowed` } },
              { status: 415 }
            );
          }
        }

        const key = `${slug}/${nanoid()}/${body.fileName ?? 'upload'}`;
        const client = createByosClient(config.storage);
        const uploadUrl = await generateByosPresignedUrl(client, {
          bucket: config.storage.bucket,
          key,
          contentType: body.contentType ?? 'application/octet-stream',
          contentLength: body.contentLength ?? 0,
        });

        return Response.json({ uploadUrl, key, metadata });
      }

      // Standard upload-complete flow
      if (action === 'upload-complete' || !action) {
        const metadata = await route.middleware?.({ req }) ?? {};
        const result = await route.onUploadComplete?.({ file: body.file as UploadedFile, metadata });
        return Response.json({ ok: true, metadata: result });
      }

      return Response.json(
        { error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } },
        { status: 400 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return Response.json(
        { error: { code: 'HANDLER_ERROR', message } },
        { status: 500 }
      );
    }
  }

  return { GET, POST };
}
