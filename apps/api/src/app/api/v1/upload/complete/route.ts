export const runtime = 'nodejs';

import { HeadObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File, FileRouter, UsageRecord } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { UploadCompleteSchema } from '@/lib/schemas';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { enqueueWebhook } from '@/lib/qstash';

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = UploadCompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileId, metadata } = parsed.data;

    // 2. Look up File record — must belong to this project and be in UPLOADING state
    const file = await File.findOne({
      _id: fileId,
      projectId: ctx.project._id,
      status: 'UPLOADING',
    });
    if (!file) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 3. Verify file exists in R2 via HEAD (D-05 step 1, T-03-08)
    // Catch both 403 and 404 — Pitfall 4: R2 may return 403 for missing objects
    // when the bucket has restricted GetObject policies
    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET,
          Key: file.key,
        }),
      );
    } catch (err) {
      if (
        err instanceof S3ServiceException &&
        (err.$response?.statusCode === 404 || err.$response?.statusCode === 403)
      ) {
        return NextResponse.json(
          {
            error: {
              type: 'invalid_request',
              code: 'FILE_NOT_IN_STORAGE',
              message: 'File not found in storage. Upload may not have completed.',
            },
          },
          { status: 422 },
        );
      }
      throw err;
    }

    // 4. Update file status to UPLOADED (D-05 step 2)
    const updatedFile = await File.findByIdAndUpdate(
      file._id,
      {
        $set: {
          status: 'UPLOADED',
          ...(metadata ? { metadata } : {}),
        },
      },
      { new: true },
    );

    if (!updatedFile) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 5. Atomic usage increment — upsert for current month period (D-05 step 4)
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    await UsageRecord.findOneAndUpdate(
      { userId: ctx.project.userId, period },
      { $inc: { storageUsed: file.size, uploads: 1 } },
      { upsert: true, new: true },
    );

    // 6. Enqueue webhook (D-05 step 3, D-09) — fire-and-forget
    // Extract routeSlug from the key pattern: {projectId}/{routeSlug}/{nanoid}/{fileName}
    const routeSlugPart = file.key.split('/')[1];
    const fileRouter = routeSlugPart
      ? await FileRouter.findOne({
          projectId: ctx.project._id,
          slug: routeSlugPart,
        })
      : null;
    if (fileRouter?.webhookUrl) {
      // Fire-and-forget — do not await delivery confirmation
      void enqueueWebhook(fileRouter.webhookUrl, {
        file: {
          id: file._id,
          key: file.key,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          metadata: updatedFile.metadata,
        },
        projectId: ctx.project._id.toString(),
      });
    }

    // 7. Return complete file metadata
    return NextResponse.json({
      file: {
        id: updatedFile._id,
        key: updatedFile.key,
        name: updatedFile.name,
        size: updatedFile.size,
        type: updatedFile.type,
        url: updatedFile.url,
        status: updatedFile.status,
        metadata: updatedFile.metadata,
        createdAt: updatedFile.createdAt,
      },
    });
  } catch (err) {
    return serializeError(err);
  }
}

export const POST = withApiKey(handler, true);
