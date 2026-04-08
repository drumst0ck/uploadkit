export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { connectDB, File, UsageRecord } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { UpdateFileMetadataSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';
import { r2Client, R2_BUCKET } from '@/lib/storage';

// GET /api/v1/files/:key — retrieve single file by key
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const decodedKey = decodeURIComponent(params['key'] as string);
  await connectDB();

  const file = await File.findOne({
    key: decodedKey,
    projectId: ctx.project._id,
    deletedAt: null,
  }).lean();

  if (!file) {
    throw new NotFoundError('File', decodedKey);
  }

  return NextResponse.json({ file });
}

// PATCH /api/v1/files/:key — update file metadata
async function handlePatch(
  req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const decodedKey = decodeURIComponent(params['key'] as string);

  const body = await req.json() as unknown;
  const parsed = UpdateFileMetadataSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  const file = await File.findOneAndUpdate(
    { key: decodedKey, projectId: ctx.project._id, deletedAt: null },
    { $set: { metadata: parsed.data.metadata } },
    { new: true },
  ).lean();

  if (!file) {
    throw new NotFoundError('File', decodedKey);
  }

  return NextResponse.json({ file });
}

// DELETE /api/v1/files/:key — remove from R2 + soft-delete in DB + decrement usage
async function handleDelete(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const decodedKey = decodeURIComponent(params['key'] as string);
  await connectDB();

  // 1. Find the file (must belong to this project)
  const file = await File.findOne({
    key: decodedKey,
    projectId: ctx.project._id,
    deletedAt: null,
  });

  if (!file) {
    throw new NotFoundError('File', decodedKey);
  }

  // 2. Delete from R2 (T-03-16: do this before soft-delete to avoid orphaned DB records)
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key }),
  );

  // 3. Soft delete in DB (T-03-16: prevents double-decrement if request retried)
  await File.findByIdAndUpdate(file._id, {
    $set: { deletedAt: new Date(), status: 'DELETED' },
  });

  // 4. Decrement storage usage (atomic negative $inc)
  const period = new Date().toISOString().slice(0, 7);
  await UsageRecord.findOneAndUpdate(
    { userId: ctx.project.userId, period },
    { $inc: { storageUsed: -file.size } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}

export const GET = withApiKey(async (req, ctx, params) => {
  try {
    return await handleGet(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});

export const PATCH = withApiKey(async (req, ctx, params) => {
  try {
    return await handlePatch(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});

export const DELETE = withApiKey(async (req, ctx, params) => {
  try {
    return await handleDelete(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});
