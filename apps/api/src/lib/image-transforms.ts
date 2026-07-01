import { createHash, createHmac } from 'node:crypto';
import { connectDB, ImageTransformation, UsageRecord } from '@uploadkitdev/db';
import { UploadKitError } from '@uploadkitdev/shared';
import type { Types } from 'mongoose';

export interface CanonicalImageTransform {
  width?: number | undefined;
  height?: number | undefined;
  fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  quality: number;
  format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
}

const ONE_HOUR_SECONDS = 3_600;
const LEDGER_RETENTION_DAYS = 120;

export function createImageTransformUrl(
  key: string,
  transform: CanonicalImageTransform,
  now = new Date(),
): { url: string; expiresAt: string } {
  const baseUrl = requiredEnv('IMAGE_TRANSFORM_BASE_URL').replace(/\/+$/, '');
  const secret = requiredEnv('IMAGE_TRANSFORM_SECRET');
  // Stable within an hour for cache reuse, with a maximum lifetime of 25 hours.
  // This bounds access after a file is deleted or a subscription is downgraded.
  const expires = Math.floor(now.getTime() / 1000 / ONE_HOUR_SECONDS) * ONE_HOUR_SECONDS
    + 25 * ONE_HOUR_SECONDS;
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

export function imageTransformUnits(transform: CanonicalImageTransform): number {
  return transform.format === 'auto' ? 3 : 1;
}

export async function reserveUniqueImageTransform(input: {
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  fileId: Types.ObjectId;
  period: string;
  fingerprint: string;
  limit: number;
  units: number;
}): Promise<{ counted: boolean; usage: number }> {
  const db = await connectDB();
  try {
    return await db.connection.transaction(async (session) => {
      const existing = await ImageTransformation.findOne({
        userId: input.userId,
        period: input.period,
        fingerprint: input.fingerprint,
      }).session(session).lean();
      if (existing) {
        const usage = await UsageRecord.findOne({ userId: input.userId, period: input.period })
          .session(session)
          .select('imageTransforms')
          .lean();
        return { counted: false, usage: usage?.imageTransforms ?? 0 };
      }

      const current = await UsageRecord.findOne({ userId: input.userId, period: input.period })
        .session(session)
        .select('imageTransforms')
        .lean();
      const used = current?.imageTransforms ?? 0;
      if (used + input.units > input.limit) throwLimitExceeded(input.limit);

      await ImageTransformation.create([{
        userId: input.userId,
        projectId: input.projectId,
        fileId: input.fileId,
        period: input.period,
        fingerprint: input.fingerprint,
        units: input.units,
        expiresAt: new Date(Date.now() + LEDGER_RETENTION_DAYS * 86_400_000),
      }], { session });
      const usage = await UsageRecord.findOneAndUpdate(
        { userId: input.userId, period: input.period },
        {
          $inc: { imageTransforms: input.units },
          $setOnInsert: { userId: input.userId, period: input.period },
        },
        { new: true, upsert: true, session, setDefaultsOnInsert: true },
      ).lean();
      return { counted: true, usage: usage?.imageTransforms ?? used + input.units };
    });
  } catch (error) {
    // A concurrent request may win the unique fingerprint insert. Treat the
    // loser as an idempotent replay after its transaction is aborted.
    if (isDuplicateKeyError(error)) {
      const usage = await UsageRecord.findOne({ userId: input.userId, period: input.period })
        .select('imageTransforms')
        .lean();
      return { counted: false, usage: usage?.imageTransforms ?? 0 };
    }
    throw error;
  }
}

function throwLimitExceeded(limit: number): never {
  throw new UploadKitError(
    'IMAGE_TRANSFORM_LIMIT_EXCEEDED',
    `Monthly image transformation limit of ${limit.toLocaleString('en-US')} reached`,
    429,
    'Wait for the next billing period or upgrade your plan',
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === 11000;
}

function requiredEnv(name: 'IMAGE_TRANSFORM_BASE_URL' | 'IMAGE_TRANSFORM_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for image transformations`);
  return value;
}
