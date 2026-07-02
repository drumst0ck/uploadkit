import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ImageTransformation, ImageTransformLock, UsageRecord } from '@uploadkitdev/db';
import type { Types } from 'mongoose';

export interface DashboardImageTransform {
  width?: number;
  height?: number;
  fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  quality: number;
  format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
}

export type DashboardTransformDelivery = 'signed' | 'public';

export function createDashboardTransformUrl(
  key: string,
  transform: DashboardImageTransform,
  delivery: DashboardTransformDelivery,
) {
  const baseUrl = requiredEnv('IMAGE_TRANSFORM_BASE_URL').replace(/\/+$/, '');
  const secret = delivery === 'public'
    ? requiredPublicSecret()
    : requiredEnv('IMAGE_TRANSFORM_SECRET');
  const hour = 3_600;
  const expires = Math.floor(Date.now() / 1000 / hour) * hour + 25 * hour;
  const encodedTransform = Buffer.from(JSON.stringify(transform)).toString('base64url');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (delivery === 'public') {
    const signature = createHmac('sha256', secret)
      .update(`public\n${encodedTransform}\n${key}`)
      .digest('base64url');
    return {
      url: `${baseUrl}/p/${signature}/${encodedTransform}/${encodedKey}`,
      expiresAt: null,
      delivery,
    };
  }
  const signature = createHmac('sha256', secret)
    .update(`${expires}\n${encodedTransform}\n${key}`)
    .digest('base64url');
  return {
    url: `${baseUrl}/t/${expires}/${signature}/${encodedTransform}/${encodedKey}`,
    expiresAt: new Date(expires * 1000).toISOString(),
    delivery,
  };
}

export async function reserveDashboardTransform(input: {
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  fileId: Types.ObjectId;
  key: string;
  transform: DashboardImageTransform;
  limit: number;
}) {
  const period = new Date().toISOString().slice(0, 7);
  const units = input.transform.format === 'auto' ? 3 : 1;
  const fingerprint = createHash('sha256')
    .update(`${input.key}\n${JSON.stringify(input.transform)}`)
    .digest('hex');
  const lockKey = `${input.userId.toString()}:${period}`;
  const owner = randomUUID();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const now = new Date();
    try {
      const lock = await ImageTransformLock.findOneAndUpdate(
        { lockKey, $or: [{ expiresAt: { $lte: now } }, { owner }] },
        { $set: { owner, expiresAt: new Date(now.getTime() + 15_000) } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
      if (lock?.owner === owner) break;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) {
        throw error;
      }
    }
    if (attempt === 7) throw new Error('Transformation quota is busy. Try again shortly.');
    await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
  }

  try {
    const existing = await ImageTransformation.findOne({
      userId: input.userId,
      period,
      fingerprint,
    }).lean();
    if (existing) {
      const usage = await UsageRecord.findOneAndUpdate(
        { userId: input.userId, period },
        {
          $max: { imageTransforms: existing.usageAfter ?? 0 },
          $setOnInsert: { userId: input.userId, period },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
      if (existing.status === 'PENDING') {
        await ImageTransformation.updateOne(
          { _id: existing._id, status: 'PENDING' },
          { $set: { status: 'COMMITTED' } },
        );
      }
      return {
        counted: false,
        used: usage?.imageTransforms ?? existing.usageAfter ?? 0,
        limit: input.limit,
        units,
      };
    }

    const current = await UsageRecord.findOne({ userId: input.userId, period }).select('imageTransforms').lean();
    const used = current?.imageTransforms ?? 0;
    const usageAfter = used + units;
    if (usageAfter > input.limit) throw new Error(`Monthly transformation limit of ${input.limit.toLocaleString('en-US')} reached.`);

    const reservation = await ImageTransformation.create({
      userId: input.userId,
      projectId: input.projectId,
      fileId: input.fileId,
      period,
      fingerprint,
      units,
      status: 'PENDING',
      usageAfter,
      expiresAt: new Date(Date.now() + 120 * 86_400_000),
    });
    await UsageRecord.findOneAndUpdate(
      { userId: input.userId, period },
      { $max: { imageTransforms: usageAfter }, $setOnInsert: { userId: input.userId, period } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    await ImageTransformation.updateOne({ _id: reservation._id }, { $set: { status: 'COMMITTED' } });
    return { counted: true, used: usageAfter, limit: input.limit, units };
  } finally {
    await ImageTransformLock.deleteOne({ lockKey, owner });
  }
}

function requiredEnv(
  name: 'IMAGE_TRANSFORM_BASE_URL' | 'IMAGE_TRANSFORM_SECRET' | 'IMAGE_TRANSFORM_PUBLIC_SECRET',
) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for image transformations`);
  return value;
}

function requiredPublicSecret() {
  const publicSecret = requiredEnv('IMAGE_TRANSFORM_PUBLIC_SECRET');
  if (publicSecret === requiredEnv('IMAGE_TRANSFORM_SECRET')) {
    throw new Error('IMAGE_TRANSFORM_PUBLIC_SECRET must differ from IMAGE_TRANSFORM_SECRET');
  }
  return publicSecret;
}
