import type { UploadKitConfig, UploadOptions, UploadResult } from './types';
import { singleUpload } from './single';
import { multipartUpload } from './multipart';

// Files above this threshold use multipart upload (per D-02)
export const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB

/**
 * Upload orchestration gateway — transparently chooses single or multipart upload
 * based on file size relative to MULTIPART_THRESHOLD.
 *
 * <= 10MB: singleUpload (one presigned PUT URL, XHR with progress)
 * >  10MB: multipartUpload (concurrent 5MB parts with ETag collection)
 */
export async function executeUpload(
  config: UploadKitConfig,
  options: UploadOptions,
): Promise<UploadResult> {
  if (options.file.size > MULTIPART_THRESHOLD) {
    return multipartUpload(config, options);
  }
  return singleUpload(config, options);
}
