import { basename, extname } from 'node:path';
import { readFile, stat } from 'node:fs/promises';

const API_BASE_URL = 'https://api.uploadkit.dev/api/v1';
const DEFAULT_ROUTE_SLUG = 'default';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
};

interface UploadRequestResponse {
  fileId: string;
  uploadUrl: string;
}

interface UploadCompleteResponse {
  file: {
    id: string;
    key: string;
    name: string;
    size: number;
    type: string;
    url: string;
    status: 'UPLOADED';
  };
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    suggestion?: string;
  };
}

export interface UploadedImage {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export class UploadKitApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly suggestion?: string;

  constructor(message: string, status: number, code?: string, suggestion?: string) {
    super(message);
    this.name = 'UploadKitApiError';
    this.status = status;
    this.code = code;
    this.suggestion = suggestion;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;

  if (!response.ok) {
    const error =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? payload.error
        : undefined;
    throw new UploadKitApiError(
      error?.message ?? `UploadKit returned HTTP ${response.status}`,
      response.status,
      error?.code,
      error?.suggestion,
    );
  }

  if (!payload) {
    throw new UploadKitApiError('UploadKit returned an empty response', response.status);
  }

  return payload as T;
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };
}

export function getImageContentType(filePath: string): string | undefined {
  return IMAGE_CONTENT_TYPES[extname(filePath).toLowerCase()];
}

export async function uploadImage(filePath: string, apiKey: string): Promise<UploadedImage> {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    throw new Error('Choose an image file, not a folder.');
  }

  const contentType = getImageContentType(filePath);
  if (!contentType) {
    throw new Error(
      'Unsupported image format. Use PNG, JPEG, GIF, WebP, AVIF, SVG, HEIC, BMP, or TIFF.',
    );
  }

  const fileName = basename(filePath);
  const requestResponse = await fetch(`${API_BASE_URL}/upload/request`, {
    method: 'POST',
    headers: authorizationHeaders(apiKey),
    body: JSON.stringify({
      fileName,
      fileSize: fileStats.size,
      contentType,
      routeSlug: DEFAULT_ROUTE_SLUG,
      metadata: { source: 'raycast' },
    }),
  });
  const uploadRequest = await parseResponse<UploadRequestResponse>(requestResponse);

  const fileContents = await readFile(filePath);
  const storageResponse = await fetch(uploadRequest.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileStats.size),
    },
    body: fileContents,
  });

  if (!storageResponse.ok) {
    throw new Error(`Storage upload failed with HTTP ${storageResponse.status}. Please try again.`);
  }

  const completeResponse = await fetch(`${API_BASE_URL}/upload/complete`, {
    method: 'POST',
    headers: authorizationHeaders(apiKey),
    body: JSON.stringify({ fileId: uploadRequest.fileId }),
  });
  const completed = await parseResponse<UploadCompleteResponse>(completeResponse);

  return completed.file;
}
