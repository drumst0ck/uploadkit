export const runtime = 'nodejs';

import { nanoid } from 'nanoid';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File, FileRouter, UsageRecord } from '@uploadkit/db';
import { NotFoundError, TierLimitError } from '@uploadkit/shared';
import { TIER_LIMITS } from '@uploadkit/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { UploadRequestSchema } from '@/lib/schemas';
import { generatePresignedPutUrl } from '@/lib/presign';
import { CDN_URL } from '@/lib/storage';

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = UploadRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileName, fileSize, contentType, routeSlug, metadata } = parsed.data;

    // 2. Look up FileRouter for this project and slug
    const fileRouter = await FileRouter.findOne({
      projectId: ctx.project._id,
      slug: routeSlug,
    });
    if (!fileRouter) {
      return serializeError(new NotFoundError('FileRouter', routeSlug));
    }

    // 3. Validate file size against BOTH fileRouter limit AND tier limit
    // Use the more restrictive (lower) of the two limits
    const effectiveMaxSize = Math.min(
      fileRouter.maxFileSize,
      TIER_LIMITS[ctx.tier].maxFileSizeBytes,
    );
    if (fileSize > effectiveMaxSize) {
      return serializeError(new TierLimitError('file size'));
    }

    // 4. Validate content type against FileRouter config
    // Empty allowedTypes array or "*/*" wildcard means all types are allowed
    const typeAllowed =
      fileRouter.allowedTypes.length === 0 ||
      fileRouter.allowedTypes.some((t: string) => {
        if (t === '*/*') return true;
        if (t.endsWith('/*')) return contentType.startsWith(t.slice(0, -1));
        return t === contentType;
      });
    if (!typeAllowed) {
      return NextResponse.json(
        {
          error: {
            type: 'invalid_request',
            code: 'INVALID_FILE_TYPE',
            message: `File type '${contentType}' is not allowed. Allowed types: ${fileRouter.allowedTypes.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 5. Check storage quota against current period usage
    // BILL-06 / D-04: FREE tier is hard-blocked; paid tiers are soft-limited (overage billed via Stripe Meters).
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const record = await UsageRecord.findOne({
      userId: ctx.project.userId,
      period,
    });
    if ((record?.storageUsed ?? 0) + fileSize > TIER_LIMITS[ctx.tier].maxStorageBytes) {
      if (ctx.tier === 'FREE') {
        // Hard block: FREE users cannot exceed their quota
        return serializeError(new TierLimitError('storage'));
      }
      // Soft limit: paid users pass through; overage is billed via Stripe Meters in /upload/complete
    }

    // 6. Check upload count quota
    // Same soft limit pattern: FREE = hard block, paid = allow through with overage billing.
    if ((record?.uploads ?? 0) >= TIER_LIMITS[ctx.tier].maxUploadsPerMonth) {
      if (ctx.tier === 'FREE') {
        return serializeError(new TierLimitError('monthly uploads'));
      }
      // Soft limit: paid users pass through
    }

    // 7. Generate R2 key: {projectId}/{routeSlug}/{nanoid}/{fileName}
    const key = `${ctx.project._id}/${routeSlug}/${nanoid()}/${fileName}`;

    // 8. Generate presigned PUT URL (15 minute expiry)
    const uploadUrl = await generatePresignedPutUrl({
      key,
      contentType,
      contentLength: fileSize,
      expiresIn: 900,
    });

    // 9. Insert File record with UPLOADING status
    const file = await File.create({
      key,
      name: fileName,
      size: fileSize,
      type: contentType,
      url: `${CDN_URL}/${key}`,
      status: 'UPLOADING',
      ...(metadata !== undefined ? { metadata } : {}),
      projectId: ctx.project._id,
    });

    // 10. Return presigned URL and file metadata
    return NextResponse.json({
      fileId: file._id.toString(),
      uploadUrl,
      key,
      cdnUrl: file.url,
    });
  } catch (err) {
    return serializeError(err);
  }
}

export const POST = withApiKey(handler, true);
