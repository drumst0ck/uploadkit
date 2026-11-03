import { createHmac, timingSafeEqual } from 'node:crypto';
import type { S3CompatibleStorage } from './types';

// A bearer proof of an authorized initiation, not an encrypted credential or a
// single-use receipt. Callbacks must be idempotent by key (see README).
export type UploadGrant = {
  version: 1;
  slug: string;
  key: string;
  name: string;
  contentLength: number;
  contentType: string;
  expiresAt: number;
};
export const UPLOAD_GRANT_TTL = 900;

function signature(storage: S3CompatibleStorage, payload: string): Buffer {
  // Bind grants to this storage configuration and protocol, including when the
  // same credentials are used for multiple buckets/endpoints.
  const context = JSON.stringify(['uploadkit/byos/grant/v1', storage.bucket,
    storage.region, storage.endpoint ?? '', storage.accessKeyId]);
  return createHmac('sha256', storage.secretAccessKey).update(context).update('\0').update(payload).digest();
}

export function signUploadGrant(storage: S3CompatibleStorage, grant: UploadGrant): string {
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  return `${payload}.${signature(storage, payload).toString('base64url')}`;
}

export function verifyUploadGrant(
  storage: S3CompatibleStorage, token: unknown, slug: string, key: unknown,
): UploadGrant | null {
  if (typeof token !== 'string' || token.length > 8192 || typeof key !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, mac] = parts as [string, string];
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(mac)) return null;
  const actual = Buffer.from(mac, 'base64url');
  const expected = signature(storage, payload);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UploadGrant;
    if (grant.version !== 1 || grant.slug !== slug || grant.key !== key || !key.startsWith(`${slug}/`) ||
        typeof grant.name !== 'string' || typeof grant.contentType !== 'string' || !grant.contentType ||
        !Number.isSafeInteger(grant.contentLength) || grant.contentLength < 0 ||
        !Number.isSafeInteger(grant.expiresAt) || grant.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return grant;
  } catch {
    return null;
  }
}
