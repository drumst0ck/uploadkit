export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Types } from 'mongoose';
import { connectDB, File, UsageRecord } from '@uploadkitdev/db';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { DeleteFilesSchema, PaginationSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';
import { r2Client, R2_BUCKET } from '@/lib/storage';

type BulkDeleteFile = {
  _id: Types.ObjectId;
  key: string;
  size?: number;
};

// GET /api/v1/files — cursor-paginated list of files for the authenticated project
async function handleGet(req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  const url = new URL(req.url);
  const params = PaginationSchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
  });

  if (!params.success) {
    return serializeValidationError(params.error);
  }

  await connectDB();

  const { limit, cursor } = params.data;

  // Cursor-based pagination: query files older than the cursor ID
  const filter = cursor
    ? { projectId: ctx.project._id, _id: { $lt: new Types.ObjectId(cursor) }, deletedAt: null }
    : { projectId: ctx.project._id, deletedAt: null };

  const files = await File.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = files.length > limit;
  const nextCursor = hasMore ? files[limit - 1]!._id.toString() : null;

  return NextResponse.json({
    files: files.slice(0, limit),
    nextCursor,
    hasMore,
  });
}

// DELETE /api/v1/files — bulk delete files by key for the authenticated project
async function handleDelete(req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  const body = await req.json() as unknown;
  const parsed = DeleteFilesSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  const requestedKeys: string[] = Array.from(new Set(parsed.data.keys));
  const files = await File.find({
    key: { $in: requestedKeys },
    projectId: ctx.project._id,
    deletedAt: null,
  }).select('_id key size').lean() as BulkDeleteFile[];

  const foundKeys = new Set(files.map((file) => file.key));
  const failures: Array<{ key: string; code: string; message: string }> = requestedKeys
    .filter((key) => !foundKeys.has(key))
    .map((key) => ({
      key,
      code: 'NOT_FOUND',
      message: 'File does not exist, is already deleted, or belongs to a different project',
    }));

  const r2Results = await Promise.allSettled(
    files.map((file) =>
      r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key })),
    ),
  );

  const successIds: Types.ObjectId[] = [];
  let reclaimedBytes = 0;

  r2Results.forEach((result, idx) => {
    const file = files[idx]!;
    if (result.status === 'fulfilled') {
      successIds.push(file._id);
      reclaimedBytes += file.size ?? 0;
      return;
    }

    failures.push({
      key: file.key,
      code: 'STORAGE_DELETE_FAILED',
      message: 'Failed to delete file from storage',
    });
    console.warn(`[files.bulk-delete] R2 DeleteObject failed for key=${file.key}:`, result.reason);
  });

  if (successIds.length > 0) {
    await File.updateMany(
      { _id: { $in: successIds }, projectId: ctx.project._id },
      { $set: { deletedAt: new Date(), status: 'DELETED' } },
    );

    if (reclaimedBytes > 0) {
      const period = new Date().toISOString().slice(0, 7);
      await UsageRecord.findOneAndUpdate(
        { userId: ctx.project.userId, period },
        { $inc: { storageUsed: -reclaimedBytes } },
        { upsert: true },
      );
    }
  }

  const deleted = successIds.length;
  const status = deleted === 0 && failures.length > 0 ? 404 : failures.length > 0 ? 207 : 200;

  return NextResponse.json(
    {
      deleted,
      failed: failures.length,
      failures,
      reclaimedBytes,
    },
    { status },
  );
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});

export const DELETE = withApiKey(async (req, ctx) => {
  try {
    return await handleDelete(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
