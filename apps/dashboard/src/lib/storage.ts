import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Per D-07: separate buckets per environment
export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? (
  process.env.NODE_ENV === 'production' ? 'uploadkit-prod' : 'uploadkit-dev'
);

// Per D-08: CDN domain when available, R2 direct URLs as fallback
export const CDN_URL = process.env.CDN_URL
  ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
