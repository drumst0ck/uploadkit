// Server-side only — do not import in browser code

import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3CompatibleStorage, UploadedFile } from './types';
import type { UploadGrant } from './upload-grant';

/**
 * Creates an S3Client configured with the developer's BYOS credentials.
 * This module must only be imported in server code. It deliberately does not import
 * Next.js's `server-only` marker so Express/Fastify/Hono can use it in plain Node.
 * Keep the storage configuration and credentials out of client modules.
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
    signableHeaders: new Set(['content-type', 'content-length']),
  });
}

/** Only call after verifying the grant; never use client-supplied file metadata. */
export async function verifyByosObject(
  client: S3Client, bucket: string, grant: UploadGrant,
): Promise<(UploadedFile & { status: string; createdAt: string }) | null> {
  let object;
  try {
    object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: grant.key }));
  } catch (err) {
    // Buckets without ListBucket permission answer 403 for a missing object.
    const status = err && typeof err === 'object' && '$metadata' in err
      ? (err.$metadata as { httpStatusCode?: number })?.httpStatusCode : undefined;
    if (status === 404 || status === 403) return null;
    throw err;
  }
  if (object.ContentLength !== grant.contentLength || object.ContentType !== grant.contentType) return null;
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: grant.key }), { expiresIn: 900 });
  return {
    id: grant.key, key: grant.key, name: grant.name,
    size: object.ContentLength, type: object.ContentType, url,
    status: 'uploaded', createdAt: (object.LastModified ?? new Date()).toISOString(),
  };
}
