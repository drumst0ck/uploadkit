import { createHash, createHmac } from 'node:crypto';
import { ImageTransformation, UsageRecord } from '@uploadkitdev/db';
import { UploadKitError } from '@uploadkitdev/shared';
import type { Types } from 'mongoose';

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

export function imageTransformFingerprint(key: string, transform: CanonicalImageTransform): string {
  return createHash('sha256').update(`${key}\n${JSON.stringify(transform)}`).digest('hex');
}

export async function reserveUniqueImageTransform(input: {
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  fileId: Types.ObjectId;
  period: string;
  fingerprint: string;
  limit: number;
}): Promise<{ counted: boolean; usage: number }> {
  const existing = await ImageTransformation.exists({
    userId: input.userId,
    period: input.period,
    fingerprint: input.fingerprint,
  });
  if (existing) {
    const usage = await UsageRecord.findOne({ userId: input.userId, period: input.period })
      .select('imageTransforms')
      .lean();
    return { counted: false, usage: usage?.imageTransforms ?? 0 };
  }

  await UsageRecord.updateOne(
    { userId: input.userId, period: input.period },
    { $setOnInsert: { imageTransforms: 0 } },
    { upsert: true },
  );
  const usage = await UsageRecord.findOneAndUpdate(
    { userId: input.userId, period: input.period, imageTransforms: { $lt: input.limit } },
    { $inc: { imageTransforms: 1 } },
    { new: true },
  ).lean();
  if (!usage) {
    throw new UploadKitError(
      'IMAGE_TRANSFORM_LIMIT_EXCEEDED',
      `Monthly image transformation limit of ${input.limit.toLocaleString('en-US')} reached`,
      429,
      'Wait for the next billing period or upgrade your plan',
    );
  }

  try {
    const result = await ImageTransformation.updateOne(
      { userId: input.userId, period: input.period, fingerprint: input.fingerprint },
      {
        $setOnInsert: {
          projectId: input.projectId,
          fileId: input.fileId,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount === 0) {
      await UsageRecord.updateOne(
        { userId: input.userId, period: input.period },
        { $inc: { imageTransforms: -1 } },
      );
      return { counted: false, usage: Math.max(0, usage.imageTransforms - 1) };
    }
    return { counted: true, usage: usage.imageTransforms };
  } catch (error) {
    await UsageRecord.updateOne(
      { userId: input.userId, period: input.period },
      { $inc: { imageTransforms: -1 } },
    );
    throw error;
  }
}

function requiredEnv(name: 'IMAGE_TRANSFORM_BASE_URL' | 'IMAGE_TRANSFORM_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for image transformations`);
  return value;
}
