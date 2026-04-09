import { UploadKitError } from '@uploadkitdev/shared';
import type {
  UploadKitConfig,
  UploadOptions,
  UploadResult,
  ListFilesOptions,
  ListFilesResult,
} from './types';
import { fetchApi } from './http';
import { executeUpload } from './upload';

/**
 * UploadKitClient — the main SDK client.
 *
 * Security (T-04-05): apiKey stored as a private non-enumerable field.
 * No toString/toJSON leaks the key.
 */
export class UploadKitClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #maxRetries: number;
  readonly #config: UploadKitConfig;

  constructor(config: UploadKitConfig) {
    if (!config.apiKey) {
      throw new UploadKitError(
        'MISSING_API_KEY',
        'apiKey is required. Pass it to createUploadKit({ apiKey: "uk_live_..." })',
        400,
        'Get your API key from app.uploadkit.dev',
      );
    }

    this.#apiKey = config.apiKey;
    this.#baseUrl = config.baseUrl ?? 'https://api.uploadkit.dev';
    this.#maxRetries = config.maxRetries ?? 3;
    this.#config = {
      apiKey: this.#apiKey,
      baseUrl: this.#baseUrl,
      maxRetries: this.#maxRetries,
    };
  }

  /**
   * Upload a file. Transparently uses single or multipart based on file size.
   * Fires onProgress callbacks during upload.
   */
  upload(options: UploadOptions): Promise<UploadResult> {
    return executeUpload(this.#config, options);
  }

  /**
   * List files for the project associated with this API key.
   */
  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.cursor !== undefined) params.set('cursor', options.cursor);

    const queryString = params.toString();
    const path = `/api/v1/files${queryString ? `?${queryString}` : ''}`;

    return fetchApi<ListFilesResult>(this.#baseUrl, this.#apiKey, path, { method: 'GET' });
  }

  /**
   * Delete a file by its storage key.
   */
  async deleteFile(key: string): Promise<void> {
    await fetchApi(
      this.#baseUrl,
      this.#apiKey,
      `/api/v1/files/${encodeURIComponent(key)}`,
      { method: 'DELETE' },
    );
  }
}
