export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File } from '@uploadkitdev/db';
import { NotFoundError, TIER_LIMITS, UploadKitError } from '@uploadkitdev/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { ImageTransformSchema } from '@/lib/schemas';
import {
  createImageTransformUrl,
  imageTransformFingerprint,
  reserveUniqueImageTransform,
} from '@/lib/image-transforms';
import { serializeError, serializeValidationError } from '@/lib/errors';

async function handlePost(req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  if (ctx.tier === 'FREE') {
    throw new UploadKitError(
      'IMAGE_TRANSFORMS_REQUIRE_PAID_PLAN',
      'Image transformations are available on paid UploadKit Cloud plans only',
      403,
      'Upgrade at app.uploadkit.dev/billing',
    );
  }

  const parsed = ImageTransformSchema.safeParse(await req.json() as unknown);
  if (!parsed.success) return serializeValidationError(parsed.error);

  await connectDB();
  const file = await File.findOne({
    key: parsed.data.key,
    projectId: ctx.project._id,
    status: 'UPLOADED',
    deletedAt: null,
  }).lean();

  if (!file) throw new NotFoundError('File', parsed.data.key);
  if (!file.type.startsWith('image/')) {
    throw new UploadKitError('UNSUPPORTED_TRANSFORM_TYPE', 'Only image files can be transformed', 415);
  }

  const { key: _key, ...transform } = parsed.data;
  const result = createImageTransformUrl(file.key, transform);
  const period = new Date().toISOString().slice(0, 7);
  const limit = ctx.imageTransformLimit ?? TIER_LIMITS[ctx.tier].maxImageTransformsPerMonth;
  const reservation = await reserveUniqueImageTransform({
    userId: ctx.project.userId,
    projectId: ctx.project._id,
    fileId: file._id,
    period,
    fingerprint: imageTransformFingerprint(file.key, transform),
    limit,
  });
  return NextResponse.json({
    ...result,
    transform,
    usage: { period, used: reservation.usage, limit, counted: reservation.counted },
  });
}

export const POST = withApiKey(async (req, ctx) => {
  try {
    return await handlePost(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
