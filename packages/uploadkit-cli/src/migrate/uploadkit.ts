import type { Readable } from 'node:stream';
import { UploadKitError } from '@uploadkitdev/shared';

/**
 * UploadKit uploader for the migration use case.
 *
 * Why not reuse `singleUpload` from @uploadkitdev/core? That path uses XHR
 * for browser progress events (see packages/core/src/single.ts) — XHR is
 * unavailable / inappropriate in a Node CLI streaming GBs from another cloud.
 * This module reuses the same logical flow (request → presigned PUT → complete)
 * with Node-fetch, which supports streaming request bodies natively.
 *
 * `fetchApi` is reimplemented inline rather than imported from core because
 * core only exports its public SDK entry — the http module is internal.
 * The shape is identical: Bearer auth, HTTPS-only, typed errors.
 */

export interface UploadResult {
  fileId: string;
  cdnUrl: string;
  key: string;
}

export interface UploadParams {
  baseUrl: string;
  apiKey: string;
  route: string;
  fileName: string;
  contentType: string;
  size: number;
  body: Readable;
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}

interface UploadRequestResponse {
  fileId: string;
  uploadUrl: string;
  key: string;
  cdnUrl: string;
}

interface UploadCompleteResponse {
  file: { _id?: string; id?: string; url: string };
}

/**
 * Local RequestInit augmentation. Node's `lib: ES2022` (without DOM) does
 * not include BodyInit, but undici's runtime accepts Node Readables when
 * `duplex: 'half'` is set. We redeclare the loose shape here so the call
 * type-checks while remaining runtime-correct. We avoid `RequestInit`
 * extension entirely because its `body` is `BodyInit | null`, and BodyInit
 * is unavailable without lib.dom.
 */
interface NodeRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: Readable | ReadableStream | ArrayBuffer | string | null;
  duplex?: 'half';
  signal?: AbortSignal;
}

export async function uploadToUploadKit(params: UploadParams): Promise<UploadResult> {
  const { baseUrl, apiKey, route, fileName, contentType, size, body, metadata, signal } = params;

  // Step 1: request presigned PUT URL.
  const requestResp = await fetchApi<UploadRequestResponse>(baseUrl, apiKey, '/api/v1/upload/request', {
    method: 'POST',
    body: {
      fileName,
      fileSize: size,
      contentType,
      routeSlug: route,
      ...(metadata ? { metadata } : {}),
    },
    ...(signal ? { signal } : {}),
  });

  // Step 2: PUT body to presigned URL. Presigned URLs are single-use, so no retry.
  // Node 18+ streams bodies natively when the body is a Readable; `duplex: 'half'`
  // is required by undici/Node fetch for stream request bodies. The body is
  // intentionally typed loose — `lib: ES2022` without DOM omits BodyInit, but
  // undici's runtime accepts Node Readables.
  const putInit: NodeRequestInit = {
    method: 'PUT',
    headers: {
      'Content-Length': String(size),
      'Content-Type': contentType,
    },
    body,
    duplex: 'half',
  };
  if (signal) putInit.signal = signal;
  const putResp = await fetch(requestResp.uploadUrl, putInit as unknown as RequestInit);

  if (!putResp.ok) {
    throw new UploadKitError(
      'PRESIGNED_PUT_FAILED',
      `PUT to presigned URL failed: ${putResp.status} ${putResp.statusText}`,
      putResp.status,
    );
  }

  // Step 3: confirm upload — registers file as UPLOADED + fires webhooks.
  const completeResp = await fetchApi<UploadCompleteResponse>(baseUrl, apiKey, '/api/v1/upload/complete', {
    method: 'POST',
    body: { fileId: requestResp.fileId, ...(metadata ? { metadata } : {}) },
    ...(signal ? { signal } : {}),
  });

  return {
    fileId: requestResp.fileId,
    cdnUrl: completeResp.file.url ?? requestResp.cdnUrl,
    key: requestResp.key,
  };
}

/**
 * Verifies API key + returns project tier (used for pre-flight size warnings).
 * Hits the lightweight `/api/v1/projects/me` endpoint.
 */
export interface ProjectInfo {
  projectId: string;
  tier: string;
}

export async function fetchProjectInfo(baseUrl: string, apiKey: string): Promise<ProjectInfo> {
  const data = await fetchApi<{ project?: { _id?: string; tier?: string } } & { tier?: string }>(
    baseUrl,
    apiKey,
    '/api/v1/projects/me',
    { method: 'GET' },
  );
  const tier = data.tier ?? data.project?.tier ?? 'FREE';
  const projectId = data.project?._id ?? 'unknown';
  return { projectId, tier };
}

/** Tiny typed fetch wrapper for the UploadKit REST API. Reimplemented here to
 * keep the CLI decoupled from core's internal module layout. */
async function fetchApi<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UploadKitError('UPLOAD_ABORTED', 'Request was aborted', 0);
    }
    throw new UploadKitError(
      'NETWORK_ERROR',
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
      0,
    );
  }

  if (!res.ok) {
    let errorBody: { error?: { code?: string; message?: string } } = {};
    try {
      errorBody = (await res.json()) as typeof errorBody;
    } catch {
      // ignore — fall through to defaults
    }
    const code = errorBody.error?.code ?? 'API_ERROR';
    const message = errorBody.error?.message ?? `Request failed with status ${res.status}`;
    throw new UploadKitError(code, message, res.status);
  }

  return (await res.json()) as T;
}
