import { UploadKitError } from '@uploadkit/shared';

interface FileConstraints {
  maxFileSize?: number;
  allowedTypes?: string[];
}

/**
 * Client-side file validation — throws UploadKitError on constraint violations.
 * This is a UX convenience; the server enforces all limits authoritatively (T-04-06).
 *
 * Supports glob-style MIME type patterns: "image/*" matches "image/jpeg", "image/png", etc.
 */
export function validateFile(file: File, constraints?: FileConstraints): void {
  if (!constraints) return;

  const { maxFileSize, allowedTypes } = constraints;

  if (maxFileSize !== undefined && file.size > maxFileSize) {
    throw new UploadKitError(
      'FILE_TOO_LARGE',
      `File size ${file.size} bytes exceeds maximum allowed size of ${maxFileSize} bytes`,
      400,
      `Reduce your file size to under ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`,
    );
  }

  if (allowedTypes !== undefined && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((pattern) => {
      // Support glob patterns like "image/*"
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2); // e.g. "image"
        return file.type.startsWith(`${prefix}/`);
      }
      return file.type === pattern;
    });

    if (!isAllowed) {
      throw new UploadKitError(
        'INVALID_FILE_TYPE',
        `File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        400,
        `Upload a file with one of the allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }
}
