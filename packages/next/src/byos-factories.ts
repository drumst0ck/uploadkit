import 'server-only';

import type { S3CompatibleStorage } from './types';

export { createByosClient, generateByosPresignedUrl } from './byos';
export type { S3CompatibleStorage } from './types';

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface S3StorageConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
}

/** Factory for Cloudflare R2 BYOS storage config. */
export function createR2Storage(config: R2StorageConfig): S3CompatibleStorage {
  return {
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
  };
}

/** Factory for AWS S3 BYOS storage config. */
export function createS3Storage(config: S3StorageConfig): S3CompatibleStorage {
  return {
    region: config.region,
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
  };
}

/** Factory for Google Cloud Storage (S3-compatible interoperability). */
export function createGCSStorage(config: S3StorageConfig): S3CompatibleStorage {
  return {
    region: config.region || 'auto',
    endpoint: config.endpoint ?? 'https://storage.googleapis.com',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
  };
}
