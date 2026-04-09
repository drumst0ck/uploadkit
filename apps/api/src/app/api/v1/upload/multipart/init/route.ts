export const runtime = 'nodejs';

import { nanoid } from 'nanoid';
import { CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File, FileRouter, UsageRecord } from '@uploadkit/db';
import { NotFoundError, TierLimitError } from '@uploadkit/shared';
import { TIER_LIMITS } from '@uploadkit/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { MultipartInitSchema } from '@/lib/schemas';
import { r2Client, R2_BUCKET, CDN_URL } from '@/lib/storage';

// Minimum part size per R2/S3 spec (5 MiB) — smaller parts are rejected
const PART_SIZE = 5 * 1024 * 1024;

// Minimum file size threshold for multipart uploads (10 MiB)
const MIN_MULTIPART_SIZE = 10 * 1024 * 1024;

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = MultipartInitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileName, fileSize, contentType, routeSlug, metadata } = parsed.data;

    // 2. Perform the same validations as single upload (FileRouter, size, type, quotas)

    // Look up FileRouter for this project and slug
    const fileRouter = await FileRouter.findOne({
      projectId: ctx.project._id,
      slug: routeSlug,
    });
    if (!fileRouter) {
      return serializeError(new NotFoundError('FileRouter', routeSlug));
    }

    // Validate file size against BOTH fileRouter limit AND tier limit
    const effectiveMaxSize = Math.min(
      fileRouter.maxFileSize,
      TIER_LIMITS[ctx.tier].maxFileSizeBytes,
    );
    if (fileSize > effectiveMaxSize) {
      return serializeError(new TierLimitError('file size'));
    }

    // Validate content type against FileRouter config
    if (
      fileRouter.allowedTypes.length > 0 &&
      !fileRouter.allowedTypes.includes(contentType)
    ) {
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

    // Check storage quota against current period usage
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const record = await UsageRecord.findOne({
      userId: ctx.project.userId,
      period,
    });
    if ((record?.storageUsed ?? 0) + fileSize > TIER_LIMITS[ctx.tier].maxStorageBytes) {
      return serializeError(new TierLimitError('storage'));
    }

    // Check upload count quota
    if ((record?.uploads ?? 0) >= TIER_LIMITS[ctx.tier].maxUploadsPerMonth) {
      return serializeError(new TierLimitError('monthly uploads'));
    }

    // 3. Enforce minimum file size for multipart — use single upload for small files
    if (fileSize <= MIN_MULTIPART_SIZE) {
      return NextResponse.json(
        {
          error: {
            type: 'invalid_request',
            code: 'FILE_TOO_SMALL_FOR_MULTIPART',
            message: `File size ${fileSize} bytes is too small for multipart upload.`,
            suggestion: 'Use POST /api/v1/upload/request for files under 10MB',
          },
        },
        { status: 400 },
      );
    }

    // 4. Generate R2 key: {projectId}/{routeSlug}/{nanoid}/{fileName}
    const safeName = fileName.replace(/\.\.\//g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
    const key = `${ctx.project._id}/${routeSlug}/${nanoid()}/${safeName}`;

    // 5. Calculate part count based on 5 MiB part size
    const partCount = Math.ceil(fileSize / PART_SIZE);

    // 6. Create multipart upload in R2
    const { UploadId } = await r2Client.send(
      new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
    );

    if (!UploadId) {
      throw new Error('R2 did not return an UploadId for multipart upload');
    }

    // 7. Generate presigned URLs for ALL parts up-front (1 hour expiry for large files)
    const parts: Array<{ partNumber: number; uploadUrl: string }> = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const uploadUrl = await getSignedUrl(
        r2Client,
        new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 3600 }, // 1 hour for large file part uploads
      );
      parts.push({ partNumber, uploadUrl });
    }

    // 8. Insert File record with UPLOADING status and uploadId for multipart tracking
    const file = await File.create({
      key,
      name: fileName,
      size: fileSize,
      type: contentType,
      url: `${CDN_URL}/${key}`,
      status: 'UPLOADING',
      uploadId: UploadId,
      ...(metadata !== undefined ? { metadata } : {}),
      projectId: ctx.project._id,
    });

    // 9. Return uploadId and all presigned part URLs up-front
    return NextResponse.json({
      fileId: file._id.toString(),
      uploadId: UploadId,
      key,
      parts,
    });
  } catch (err) {
    return serializeError(err);
  }
}

export const POST = withApiKey(handler, true);
