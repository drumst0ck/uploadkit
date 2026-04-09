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

      if (action === 'request-upload') {
        // Run middleware for auth/metadata (both modes)
        const metadata = await route.middleware?.({ req }) ?? {};

        // Validate file against route config (T-04-09 / T-QK-03)
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

        // BYOS mode: generate presigned URL via user's own storage credentials
        if (config.storage) {
          const { generateByosPresignedUrl, createByosClient } = await import('./byos');
          const { nanoid } = await import('nanoid');

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

        // Managed mode: proxy to UploadKit API with server-side API key (T-QK-02)
        if (config.apiKey) {
          const apiUrl = config.apiUrl ?? 'https://api.uploadkit.dev';
          const uploadRes = await fetch(`${apiUrl}/api/v1/upload/request`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              fileName: body.fileName,
              fileSize: body.contentLength,
              contentType: body.contentType,
              routeSlug: slug,
              ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
            }),
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            return Response.json(err, { status: uploadRes.status });
          }

          const data = await uploadRes.json() as { uploadUrl: string; key: string; fileId: string };
          return Response.json({ uploadUrl: data.uploadUrl, key: data.key, fileId: data.fileId });
        }

        // Neither storage nor apiKey configured
        return Response.json(
          { error: { code: 'MISSING_CONFIG', message: 'Either apiKey (managed mode) or storage (BYOS mode) must be configured' } },
          { status: 500 }
        );
      }

      // Upload-complete flow
      if (action === 'upload-complete' || !action) {
        // BYOS mode: file metadata provided by client in body
        if (config.storage) {
          const metadata = await route.middleware?.({ req }) ?? {};
          const result = await route.onUploadComplete?.({ file: body.file as UploadedFile, metadata });
          return Response.json({ ok: true, metadata: result });
        }

        // Managed mode: confirm upload with UploadKit API server-side (T-QK-02)
        if (config.apiKey) {
          const apiUrl = config.apiUrl ?? 'https://api.uploadkit.dev';
          const completeRes = await fetch(`${apiUrl}/api/v1/upload/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({ fileId: body.fileId }),
          });

          if (!completeRes.ok) {
            const err = await completeRes.json();
            return Response.json(err, { status: completeRes.status });
          }

          const completeData = await completeRes.json() as { file: UploadedFile };
          const metadata = await route.middleware?.({ req }) ?? {};
          const userResult = await route.onUploadComplete?.({
            file: completeData.file,
            metadata,
          });
          return Response.json({ ok: true, file: completeData.file, url: completeData.file.url, metadata: userResult });
        }

        // Neither storage nor apiKey configured
        return Response.json(
          { error: { code: 'MISSING_CONFIG', message: 'Either apiKey (managed mode) or storage (BYOS mode) must be configured' } },
          { status: 500 }
        );
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
