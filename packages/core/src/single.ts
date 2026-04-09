import { UploadKitError } from '@uploadkit/shared';
import type { UploadKitConfig, UploadOptions, UploadResult, UploadRequestResponse } from './types';
import { fetchApi } from './http';
import { withRetry } from './retry';

/**
 * Uploads a file using a single presigned PUT URL via XHR (for progress events).
 * Used when file.size <= MULTIPART_THRESHOLD (10MB).
 *
 * Flow:
 *  1. POST /api/v1/upload/request → get presigned uploadUrl + fileId
 *  2. XHR PUT file bytes directly to uploadUrl (R2 presigned URL)
 *  3. POST /api/v1/upload/complete → confirm upload, get final UploadResult
 *
 * Note: withRetry wraps the API calls but NOT the XHR PUT — presigned URLs are single-use.
 */
export async function singleUpload(
  config: UploadKitConfig,
  options: UploadOptions,
): Promise<UploadResult> {
  const { file, route, metadata, onProgress, signal } = options;
  const baseUrl = config.baseUrl ?? 'https://api.uploadkit.dev';
  const maxRetries = config.maxRetries ?? 3;

  // Step 1: Request presigned upload URL from API
  const uploadRequest = await withRetry(
    () =>
      fetchApi<UploadRequestResponse>(baseUrl, config.apiKey, '/api/v1/upload/request', {
        method: 'POST',
        body: {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          routeSlug: route,
          ...(metadata !== undefined ? { metadata } : {}),
        },
        signal,
      }),
    { maxRetries, signal },
  );

  const { fileId, uploadUrl } = uploadRequest;

  // Step 2: XHR PUT to presigned URL — enables onprogress events (Pitfall 1: must match content-type)
  await xhrPut(uploadUrl, file, { onProgress, signal });

  // Step 3: Confirm upload completion
  const completeResponse = await withRetry(
    () =>
      fetchApi<{ file: UploadResult }>(baseUrl, config.apiKey, '/api/v1/upload/complete', {
        method: 'POST',
        body: {
          fileId,
          ...(metadata !== undefined ? { metadata } : {}),
        },
        signal,
      }),
    { maxRetries, signal },
  );

  return completeResponse.file;
}

interface XhrPutOptions {
  onProgress?: ((percentage: number) => void) | undefined;
  signal?: AbortSignal | undefined;
}

function xhrPut(url: string, file: File, opts: XhrPutOptions = {}): Promise<void> {
  const { onProgress, signal } = opts;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Wire AbortSignal to XHR abort
    if (signal) {
      if (signal.aborted) {
        reject(new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0));
        return;
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Fire 100% progress on completion
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(
          new UploadKitError(
            'UPLOAD_FAILED',
            `Upload to storage failed with status ${xhr.status}`,
            xhr.status,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new UploadKitError('NETWORK_ERROR', 'Network error during file upload', 0));
    };

    xhr.onabort = () => {
      reject(new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0));
    };

    xhr.open('PUT', url);
    // Pitfall 1: Content-Type MUST match what was used to generate the presigned URL
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
