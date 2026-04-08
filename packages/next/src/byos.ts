import 'server-only';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3CompatibleStorage } from './types';

/**
 * Creates an S3Client configured with the developer's BYOS credentials.
 * Credentials stay server-side only (import 'server-only' enforces this — T-04-07).
 * `forcePathStyle: true` is required for MinIO and some S3-compatible providers.
 */
export function createByosClient(storage: S3CompatibleStorage): S3Client {
  return new S3Client({
    region: storage.region,
    ...(storage.endpoint ? { endpoint: storage.endpoint } : {}),
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

/**
 * Generates a presigned PUT URL for direct client-to-storage uploads.
 *
 * The URL is scoped to the specific key, content-type, and content-length —
 * preventing type spoofing and arbitrary overwrites (T-04-11).
 * Default expiry is 15 minutes (900 seconds).
 */
export async function generateByosPresignedUrl(
  client: S3Client,
  params: {
    bucket: string;
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn?: number;
  }
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 900,
  });
}
