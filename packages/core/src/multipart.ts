import { UploadKitError } from '@uploadkit/shared';
import type {
  UploadKitConfig,
  UploadOptions,
  UploadResult,
  MultipartInitResponse,
} from './types';
import { fetchApi } from './http';
import { withRetry } from './retry';

// S3/R2 minimum part size is 5MB (except the last part)
const PART_SIZE = 5 * 1024 * 1024; // 5MB
// Upload 3 parts concurrently to balance throughput vs browser connection limits
const CONCURRENCY = 3;

/**
 * Uploads a large file (> 10MB) using multipart upload with concurrent part uploads.
 * Parts are uploaded in batches of CONCURRENCY=3 using Promise.all.
 *
 * Flow:
 *  1. POST /api/v1/upload/multipart/init → get uploadId + presigned part URLs
 *  2. Upload each part concurrently (3 at a time) via XHR, collect ETags
 *  3. POST /api/v1/upload/multipart/complete → assemble parts, get UploadResult
 *  On error: POST /api/v1/upload/multipart/abort → cleanup
 */
export async function multipartUpload(
  config: UploadKitConfig,
  options: UploadOptions,
): Promise<UploadResult> {
  const { file, route, metadata, onProgress, signal } = options;
  const baseUrl = config.baseUrl ?? 'https://api.uploadkit.dev';
  const maxRetries = config.maxRetries ?? 3;

  // Step 1: Initialize multipart upload
  const initResponse = await withRetry(
    () =>
      fetchApi<MultipartInitResponse>(
        baseUrl,
        config.apiKey,
        '/api/v1/upload/multipart/init',
        {
          method: 'POST',
          body: {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            routeSlug: route,
            ...(metadata !== undefined ? { metadata } : {}),
          },
          signal,
        },
      ),
    { maxRetries, signal },
  );

  const { fileId, uploadId, parts } = initResponse;
  const totalParts = parts.length;
  let completedParts = 0;

  const etags: Array<{ partNumber: number; etag: string }> = [];

  try {
    // Step 2: Upload parts in batches of CONCURRENCY=3
    for (let batchStart = 0; batchStart < totalParts; batchStart += CONCURRENCY) {
      // Check abort before each batch
      if (signal?.aborted) {
        throw new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0);
      }

      const batch = parts.slice(batchStart, batchStart + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (part) => {
          const start = (part.partNumber - 1) * PART_SIZE;
          const end = Math.min(start + PART_SIZE, file.size);
          const partBlob = file.slice(start, end);

          const etag = await xhrPutPart(part.uploadUrl, partBlob, file.type, signal);

          completedParts++;
          if (onProgress) {
            onProgress(Math.round((completedParts / totalParts) * 100));
          }

          return { partNumber: part.partNumber, etag };
        }),
      );

      etags.push(...batchResults);
    }

    // Step 3: Complete multipart upload — assemble all parts
    const completeResponse = await withRetry(
      () =>
        fetchApi<{ file: UploadResult }>(
          baseUrl,
          config.apiKey,
          '/api/v1/upload/multipart/complete',
          {
            method: 'POST',
            body: {
              fileId,
              uploadId,
              parts: etags,
              ...(metadata !== undefined ? { metadata } : {}),
            },
            signal,
          },
        ),
      { maxRetries, signal },
    );

    return completeResponse.file;
  } catch (err) {
    // Pitfall 3: Always abort multipart on failure to avoid orphaned uploads in R2
    try {
      await fetchApi(baseUrl, config.apiKey, '/api/v1/upload/multipart/abort', {
        method: 'POST',
        body: { fileId, uploadId },
      });
    } catch {
      // Abort failure is non-fatal — log but don't mask original error
    }
    throw err;
  }
}

/**
 * Upload a single part blob to a presigned URL via XHR.
 * Returns the ETag from the response header (required for multipart complete).
 * Pitfall 2: ETag header must be captured — throw if missing.
 */
function xhrPutPart(
  url: string,
  part: Blob,
  contentType: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      if (signal.aborted) {
        reject(new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0));
        return;
      }
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Pitfall 2: ETag is required for multipart complete assembly
        const etag = xhr.getResponseHeader('ETag');
        if (!etag) {
          reject(
            new UploadKitError(
              'MISSING_ETAG',
              'ETag header missing from part upload response. R2 should always return ETag.',
              500,
            ),
          );
          return;
        }
        resolve(etag);
      } else {
        reject(
          new UploadKitError(
            'PART_UPLOAD_FAILED',
            `Part upload failed with status ${xhr.status}`,
            xhr.status,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new UploadKitError('NETWORK_ERROR', 'Network error during part upload', 0));
    };

    xhr.onabort = () => {
      reject(new UploadKitError('UPLOAD_ABORTED', 'Part upload was aborted', 0));
    };

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(part);
  });
}
