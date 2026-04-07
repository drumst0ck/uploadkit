import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET } from './storage';

// Per D-09: key path = {projectId}/{fileRouterId}/{uuid}/{filename}
export async function generatePresignedPutUrl(params: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn: params.expiresIn ?? 900, // 15 minutes
  });
}
