// Server-side only — do not import in browser code

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
      console.error('[UploadKit] GET handler failed', err);
      return Response.json(
        { error: { code: 'HANDLER_ERROR', message: 'Internal server error' } },
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
        key?: string;
        uploadToken?: string;
        fileId?: string;
        fileName?: string;
        contentType?: string;
        contentLength?: number;
      };

      const { action } = body;

      if (action === 'request-upload') {
        // Run middleware for auth/metadata (both modes)
        const metadata = await route.middleware?.({ req }) ?? {};

        // Require numeric/string attributes before applying route limits.
        if (!Number.isSafeInteger(body.contentLength) || (body.contentLength ?? -1) < 0 ||
            typeof body.contentType !== 'string' || !body.contentType.trim()) {
          return Response.json(
            { error: { code: 'INVALID_UPLOAD', message: 'contentLength and contentType are required' } },
            { status: 400 }
          );
        }

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

          // Sanitize fileName: strip path traversal, allow only safe chars, cap length
          const safeName = (body.fileName ?? 'upload')
            .replace(/\.\.\//g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 255);
          const key = `${slug}/${nanoid()}/${safeName}`;
          const client = createByosClient(config.storage);
          const uploadUrl = await generateByosPresignedUrl(client, {
            bucket: config.storage.bucket,
            key,
            contentType: body.contentType,
            contentLength: body.contentLength!,
          });

          const { signUploadGrant, UPLOAD_GRANT_TTL } = await import('./upload-grant');
          const uploadToken = signUploadGrant(config.storage, {
            version: 1, slug, key, name: safeName,
            contentType: body.contentType, contentLength: body.contentLength!,
            expiresAt: Math.floor(Date.now() / 1000) + UPLOAD_GRANT_TTL,
          });
          return Response.json({ uploadUrl, key, uploadToken, metadata });
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
        // BYOS requires proof of initiation. There is intentionally no legacy
        // body.file fallback: old clients must upgrade with the server.
        if (config.storage) {
          const metadata = await route.middleware?.({ req }) ?? {};
          const { verifyUploadGrant } = await import('./upload-grant');
          const grant = verifyUploadGrant(config.storage, body.uploadToken, slug, body.key);
          if (!grant) {
            return Response.json(
              { error: { code: 'INVALID_UPLOAD_GRANT', message: 'A valid, unexpired upload grant is required' } },
              { status: 400 }
            );
          }
          if ((route.maxFileSize !== undefined && grant.contentLength > parseFileSize(route.maxFileSize)) ||
              (route.allowedTypes && !route.allowedTypes.includes(grant.contentType))) {
            return Response.json(
              { error: { code: 'INVALID_UPLOAD', message: 'Upload no longer satisfies route limits' } },
              { status: 400 }
            );
          }
          const { createByosClient, verifyByosObject } = await import('./byos');
          const file = await verifyByosObject(createByosClient(config.storage), config.storage.bucket, grant);
          if (!file) {
            return Response.json(
              { error: { code: 'UPLOAD_VERIFICATION_FAILED', message: 'Uploaded object is missing or does not match the upload grant' } },
              { status: 400 }
            );
          }
          const result = await route.onUploadComplete?.({ file, metadata });
          return Response.json({ ok: true, file, url: file.url, metadata: result });
        }

        // Managed mode: confirm upload with UploadKit API server-side (T-QK-02)
        if (config.apiKey) {
          const metadata = await route.middleware?.({ req }) ?? {};
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
      console.error('[UploadKit] POST handler failed', err);
      return Response.json(
        { error: { code: 'HANDLER_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
  }

  return { GET, POST };
}
