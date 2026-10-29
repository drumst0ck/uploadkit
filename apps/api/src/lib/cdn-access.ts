import { createHmac } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/storage';

export type CdnAccess = 'public' | 'signed';

/** Lifetime of signed CDN URLs returned by the API for SIGNED projects. */
export const SIGNED_URL_TTL_SECONDS = 3_600;

/**
 * The transform worker has no database. A SIGNED project is announced to it by
 * a marker object `_acl/{projectId}` in the bucket; its absence means PUBLIC.
 */
export async function syncCdnAccessMarker(projectId: string, access: CdnAccess): Promise<void> {
  const Key = `_acl/${projectId}`;
  if (access === 'signed') {
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key, Body: 'signed' }));
  } else {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key }));
  }
}

/** Append `exp`/`sig` verified by the worker (HMAC-SHA256 of "cdn\n{exp}\n{key}"). */
export function signCdnUrl(url: string, key: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const secret = process.env.IMAGE_TRANSFORM_SECRET;
  if (!secret) throw new Error('IMAGE_TRANSFORM_SECRET is required to sign CDN URLs');
  const exp = nowSeconds + SIGNED_URL_TTL_SECONDS;
  const sig = createHmac('sha256', secret).update(`cdn\n${exp}\n${key}`).digest('base64url');
  const signed = new URL(url);
  signed.searchParams.set('exp', String(exp));
  signed.searchParams.set('sig', sig);
  return signed.toString();
}

/** Return `file` with a freshly signed `url` when the project is SIGNED; otherwise unchanged. */
export function withSignedUrl<T extends { key: string; url?: string }>(
  project: { cdnAccess?: CdnAccess | undefined },
  file: T,
): T {
  if (project.cdnAccess !== 'signed' || !file.url) return file;
  return { ...file, url: signCdnUrl(file.url, file.key) };
}
