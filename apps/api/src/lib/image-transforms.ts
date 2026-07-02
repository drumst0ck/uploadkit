import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ImageTransformation, ImageTransformLock, UsageRecord } from '@uploadkitdev/db';
import { UploadKitError } from '@uploadkitdev/shared';
import type { Types } from 'mongoose';

export interface CanonicalImageTransform {
  width?: number | undefined;
  height?: number | undefined;
  fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  quality: number;
  format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
}

export type ImageTransformDelivery = 'signed' | 'public';

const ONE_HOUR_SECONDS = 3_600;
const LEDGER_RETENTION_DAYS = 120;
const LOCK_LEASE_MS = 15_000;
const LOCK_ATTEMPTS = 8;

export function createImageTransformUrl(
  key: string,
  transform: CanonicalImageTransform,
  delivery: ImageTransformDelivery = 'signed',
  now = new Date(),
): { url: string; expiresAt: string | null; delivery: ImageTransformDelivery } {
  const baseUrl = requiredEnv('IMAGE_TRANSFORM_BASE_URL').replace(/\/+$/, '');
  const secret = delivery === 'public'
    ? requiredPublicSecret()
    : requiredEnv('IMAGE_TRANSFORM_SECRET');
  // Stable within an hour for cache reuse, with a maximum lifetime of 25 hours.
  // This bounds access after a file is deleted or a subscription is downgraded.
  const expires = Math.floor(now.getTime() / 1000 / ONE_HOUR_SECONDS) * ONE_HOUR_SECONDS
    + 25 * ONE_HOUR_SECONDS;
  const encodedTransform = Buffer.from(JSON.stringify(transform)).toString('base64url');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  if (delivery === 'public') {
    const signature = createHmac('sha256', secret)
      .update(publicSigningPayload(encodedTransform, key))
      .digest('base64url');
    return {
      url: `${baseUrl}/p/${signature}/${encodedTransform}/${encodedKey}`,
      expiresAt: null,
      delivery,
    };
  }

  const signature = createHmac('sha256', secret)
    .update(signingPayload(expires, encodedTransform, key))
    .digest('base64url');
  return {
    url: `${baseUrl}/t/${expires}/${signature}/${encodedTransform}/${encodedKey}`,
    expiresAt: new Date(expires * 1000).toISOString(),
    delivery,
  };
}

export function signingPayload(expires: number, encodedTransform: string, key: string): string {
  return `${expires}\n${encodedTransform}\n${key}`;
}

export function publicSigningPayload(encodedTransform: string, key: string): string {
  return `public\n${encodedTransform}\n${key}`;
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
  const lockKey = `${input.userId.toString()}:${input.period}`;
  const owner = randomUUID();
  await acquireLock(lockKey, owner);
  try {
    await recoverPendingReservations(input.userId, input.period);
    const existing = await ImageTransformation.findOne({
      userId: input.userId,
      period: input.period,
      fingerprint: input.fingerprint,
    }).lean();
    if (existing) {
      const usage = await setUsageFloor(input.userId, input.period, existing.usageAfter ?? 0);
      return { counted: false, usage };
    }

    const current = await UsageRecord.findOne({ userId: input.userId, period: input.period })
      .select('imageTransforms')
      .lean();
    const used = current?.imageTransforms ?? 0;
    const usageAfter = used + input.units;
    if (usageAfter > input.limit) throwLimitExceeded(input.limit);

    const reservation = await ImageTransformation.create({
      userId: input.userId,
      projectId: input.projectId,
      fileId: input.fileId,
      period: input.period,
      fingerprint: input.fingerprint,
      units: input.units,
      status: 'PENDING',
      usageAfter,
      expiresAt: new Date(Date.now() + LEDGER_RETENTION_DAYS * 86_400_000),
    });
    const usage = await setUsageFloor(input.userId, input.period, usageAfter);
    await ImageTransformation.updateOne(
      { _id: reservation._id, status: 'PENDING' },
      { $set: { status: 'COMMITTED' } },
    );
    return { counted: true, usage };
  } finally {
    await ImageTransformLock.deleteOne({ lockKey, owner });
  }
}

async function acquireLock(lockKey: string, owner: string): Promise<void> {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    const now = new Date();
    try {
      const lock = await ImageTransformLock.findOneAndUpdate(
        { lockKey, $or: [{ expiresAt: { $lte: now } }, { owner }] },
        { $set: { owner, expiresAt: new Date(now.getTime() + LOCK_LEASE_MS) } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
      if (lock?.owner === owner) return;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
    await delay(25 * 2 ** attempt);
  }
  throw new UploadKitError(
    'IMAGE_TRANSFORM_RESERVATION_BUSY',
    'Image transformation quota is busy; retry shortly',
    503,
  );
}

async function recoverPendingReservations(userId: Types.ObjectId, period: string): Promise<void> {
  const pending = await ImageTransformation.find({ userId, period, status: 'PENDING' })
    .sort({ usageAfter: 1 })
    .lean();
  for (const reservation of pending) {
    await setUsageFloor(userId, period, reservation.usageAfter);
    await ImageTransformation.updateOne(
      { _id: reservation._id, status: 'PENDING' },
      { $set: { status: 'COMMITTED' } },
    );
  }
}

async function setUsageFloor(userId: Types.ObjectId, period: string, usage: number): Promise<number> {
  const record = await UsageRecord.findOneAndUpdate(
    { userId, period },
    {
      $max: { imageTransforms: usage },
      $setOnInsert: { userId, period },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
  return record?.imageTransforms ?? usage;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

function requiredEnv(
  name: 'IMAGE_TRANSFORM_BASE_URL' | 'IMAGE_TRANSFORM_SECRET' | 'IMAGE_TRANSFORM_PUBLIC_SECRET',
): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for image transformations`);
  return value;
}

function requiredPublicSecret(): string {
  const publicSecret = requiredEnv('IMAGE_TRANSFORM_PUBLIC_SECRET');
  if (publicSecret === requiredEnv('IMAGE_TRANSFORM_SECRET')) {
    throw new Error('IMAGE_TRANSFORM_PUBLIC_SECRET must differ from IMAGE_TRANSFORM_SECRET');
  }
  return publicSecret;
}
