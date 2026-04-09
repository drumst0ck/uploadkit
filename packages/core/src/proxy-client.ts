import { UploadKitError } from '@uploadkit/shared';
import type { UploadResult } from './types';

export interface ProxyClientConfig {
  /** Relative URL of the local uploadkit handler, e.g. "/api/uploadkit" */
  endpoint: string;
}

export type ProgressGranularity = 'coarse' | 'fine' | 'all';

export interface ProxyUploadOptions {
  file: File;
  route: string;
  metadata?: Record<string, unknown>;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
  /** Controls how often onProgress is called. Default: 'coarse' (every 10%). */
  progressGranularity?: ProgressGranularity;
}

/**
 * ProxyUploadKitClient — browser-safe upload client.
 *
 * Security (T-QK-01): This class never accepts, stores, or transmits an API key.
 * All requests go through a local Next.js endpoint which holds the secret key server-side.
 *
 * Flow:
 *  1. POST /{endpoint}/{route} with action:'request-upload' -> get presigned URL from server
 *  2. XHR PUT file directly to presigned URL (R2) with progress events
 *  3. POST /{endpoint}/{route} with action:'upload-complete' -> confirm + get result
 */
export class ProxyUploadKitClient {
  readonly #endpoint: string;

  constructor(config: ProxyClientConfig) {
    this.#endpoint = config.endpoint.replace(/\/$/, '');
  }

  async upload(options: ProxyUploadOptions): Promise<UploadResult> {
    const { file, route, metadata, onProgress, signal, progressGranularity } = options;

    // 1. Request presigned URL from local server endpoint
    const requestRes = await fetch(`${this.#endpoint}/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request-upload',
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        contentLength: file.size,
        ...(metadata !== undefined ? { metadata } : {}),
      }),
      ...(signal ? { signal } : {}),
    });

    if (!requestRes.ok) {
      let errBody: { error?: { code?: string; message?: string } } = {};
      try { errBody = await requestRes.json() as typeof errBody; } catch { /* ignore */ }
      throw new UploadKitError(
        errBody.error?.code ?? 'UPLOAD_REQUEST_FAILED',
        errBody.error?.message ?? `Upload request failed with status ${requestRes.status}`,
        requestRes.status,
      );
    }

    const { uploadUrl, key, fileId } = await requestRes.json() as {
      uploadUrl: string; key: string; fileId: string;
    };

    // 2. Upload directly to presigned URL using XHR (for progress events)
    await this.#xhrPut(uploadUrl, file, {
      ...(onProgress !== undefined ? { onProgress } : {}),
      ...(signal !== undefined ? { signal } : {}),
      ...(progressGranularity !== undefined ? { progressGranularity } : {}),
    });

    // 3. Confirm upload complete via local endpoint
    const completeRes = await fetch(`${this.#endpoint}/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-complete', key, fileId }),
      ...(signal ? { signal } : {}),
    });

    if (!completeRes.ok) {
      let errBody: { error?: { code?: string; message?: string } } = {};
      try { errBody = await completeRes.json() as typeof errBody; } catch { /* ignore */ }
      throw new UploadKitError(
        errBody.error?.code ?? 'UPLOAD_COMPLETE_FAILED',
        errBody.error?.message ?? `Upload complete request failed with status ${completeRes.status}`,
        completeRes.status,
      );
    }

    const completeData = await completeRes.json() as {
      ok: boolean; file?: UploadResult; url?: string; metadata?: unknown;
    };

    // Return UploadResult — prefer the full file object from the server if available,
    // otherwise construct a minimal one from what we know
    if (completeData.file) {
      return completeData.file;
    }

    return {
      id: fileId,
      key,
      name: file.name,
      size: file.size,
      type: file.type,
      url: completeData.url ?? key,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    };
  }

  // XHR upload with progress — same proven pattern from single.ts
  #xhrPut(
    url: string,
    file: File,
    opts: { onProgress?: (p: number) => void; signal?: AbortSignal; progressGranularity?: ProgressGranularity } = {},
  ): Promise<void> {
    const { onProgress, signal, progressGranularity = 'coarse' } = opts;

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (signal) {
        if (signal.aborted) {
          reject(new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0));
          return;
        }
        signal.addEventListener('abort', () => { xhr.abort(); });
      }

      // Track last reported percent for granularity throttling
      let lastReportedPercent = -1;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);

          if (progressGranularity === 'all') {
            onProgress(percent);
          } else {
            // Threshold step: 10 for coarse, 2 for fine
            const step = progressGranularity === 'fine' ? 2 : 10;
            const nextThreshold = Math.ceil((lastReportedPercent + 1) / step) * step;
            if (percent >= nextThreshold || percent === 100) {
              lastReportedPercent = percent;
              onProgress(percent);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new UploadKitError(
            'UPLOAD_FAILED',
            `Upload to storage failed with status ${xhr.status}`,
            xhr.status,
          ));
        }
      };

      xhr.onerror = () => {
        reject(new UploadKitError('NETWORK_ERROR', 'Network error during file upload', 0));
      };

      xhr.onabort = () => {
        reject(new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0));
      };

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }
}

export function createProxyClient(config: ProxyClientConfig): ProxyUploadKitClient {
  return new ProxyUploadKitClient(config);
}
