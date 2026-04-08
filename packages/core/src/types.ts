export type { UploadKitError } from '@uploadkit/shared';

// SDK configuration
export interface UploadKitConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
}

// Upload options provided by the SDK consumer
export interface UploadOptions {
  file: File;
  route: string;
  metadata?: Record<string, unknown>;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
}

// Public result shape returned to SDK consumers
export interface UploadResult {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Options for listing files
export interface ListFilesOptions {
  limit?: number;
  cursor?: string;
}

// Paginated list result
export interface ListFilesResult {
  files: UploadResult[];
  nextCursor?: string;
}

// Internal: response from POST /api/v1/upload/request
export interface UploadRequestResponse {
  fileId: string;
  uploadUrl: string;
  key: string;
  cdnUrl: string;
}

// Internal: response from POST /api/v1/upload/multipart/init
export interface MultipartInitResponse {
  fileId: string;
  uploadId: string;
  key: string;
  parts: Array<{ partNumber: number; uploadUrl: string }>;
}
