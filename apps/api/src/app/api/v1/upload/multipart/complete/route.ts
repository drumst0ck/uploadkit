export const runtime = 'nodejs';

import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File, FileRouter, UsageRecord } from '@uploadkitdev/db';
import { NotFoundError } from '@uploadkitdev/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { MultipartCompleteSchema } from '@/lib/schemas';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { enqueueWebhook } from '@/lib/qstash';

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = MultipartCompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileId, uploadId, parts, metadata } = parsed.data;

    // 2. Look up File record — must belong to this project, be UPLOADING, and match uploadId
    const file = await File.findOne({
      _id: fileId,
      projectId: ctx.project._id,
      status: 'UPLOADING',
      uploadId,
    });
    if (!file) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 3. Complete the multipart upload in R2 with ETags from client
    // R2 validates ETags server-side — invalid ETags cause a hard R2 error (T-03-12 accepted)
    await r2Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: file.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((p) => ({
            PartNumber: p.partNumber,
            ETag: p.etag,
          })),
        },
      }),
    );

    // 4. Update file status to UPLOADED and clear uploadId
    const updatedFile = await File.findByIdAndUpdate(
      file._id,
      {
        $set: {
          status: 'UPLOADED',
          uploadId: null,
          ...(metadata !== undefined ? { metadata } : {}),
        },
      },
      { new: true },
    );

    if (!updatedFile) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 5. Atomic usage increment — upsert for current month period
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    await UsageRecord.findOneAndUpdate(
      { userId: ctx.project.userId, period },
      { $inc: { storageUsed: file.size, uploads: 1 } },
      { upsert: true, new: true },
    );

    // 6. Enqueue webhook (fire-and-forget) if FileRouter has a webhookUrl
    // Extract routeSlug from key pattern: {projectId}/{routeSlug}/{nanoid}/{fileName}
    const routeSlugPart = file.key.split('/')[1];
    const fileRouter = routeSlugPart
      ? await FileRouter.findOne({
          projectId: ctx.project._id,
          slug: routeSlugPart,
        })
      : null;

    if (fileRouter?.webhookUrl) {
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

    // 7. Return the same file response shape as single upload complete
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
