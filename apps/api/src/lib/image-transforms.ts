import { createHmac } from 'node:crypto';

export interface CanonicalImageTransform {
  width?: number | undefined;
  height?: number | undefined;
  fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  quality: number;
  format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
}

const ONE_DAY_SECONDS = 86_400;

export function createImageTransformUrl(
  key: string,
  transform: CanonicalImageTransform,
  now = new Date(),
): { url: string; expiresAt: string } {
  const baseUrl = requiredEnv('IMAGE_TRANSFORM_BASE_URL').replace(/\/+$/, '');
  const secret = requiredEnv('IMAGE_TRANSFORM_SECRET');
  // Stable within a UTC day, which preserves CDN cache reuse while ensuring
  // downgraded users cannot mint URLs with unlimited lifetime.
  const expires = Math.floor(now.getTime() / 1000 / ONE_DAY_SECONDS) * ONE_DAY_SECONDS
    + 2 * ONE_DAY_SECONDS;
  const encodedTransform = Buffer.from(JSON.stringify(transform)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(signingPayload(expires, encodedTransform, key))
    .digest('base64url');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  return {
    url: `${baseUrl}/t/${expires}/${signature}/${encodedTransform}/${encodedKey}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  };
}

export function signingPayload(expires: number, encodedTransform: string, key: string): string {
  return `${expires}\n${encodedTransform}\n${key}`;
}

function requiredEnv(name: 'IMAGE_TRANSFORM_BASE_URL' | 'IMAGE_TRANSFORM_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for image transformations`);
  return value;
}
