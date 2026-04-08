export const runtime = 'nodejs';

import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { MultipartAbortSchema } from '@/lib/schemas';
import { r2Client, R2_BUCKET } from '@/lib/storage';

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = MultipartAbortSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileId, uploadId } = parsed.data;

    // 2. Look up File record — must belong to this project, be UPLOADING, and match uploadId
    // Scoped by projectId from withApiKey to prevent cross-project abort (T-03-09)
    const file = await File.findOne({
      _id: fileId,
      projectId: ctx.project._id,
      status: 'UPLOADING',
      uploadId,
    });
    if (!file) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 3. Cancel the in-progress multipart upload in R2
    await r2Client.send(
      new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: file.key,
        UploadId: uploadId,
      }),
    );

    // 4. Remove the file record (no UPLOADED state — upload was cancelled)
    await File.deleteOne({ _id: file._id });

    // 5. Return success
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serializeError(err);
  }
}

export const POST = withApiKey(handler, true);
