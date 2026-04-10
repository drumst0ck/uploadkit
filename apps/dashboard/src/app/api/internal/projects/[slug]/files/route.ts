import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, File, UsageRecord } from '@uploadkitdev/db';
import { r2Client, R2_BUCKET } from '../../../../../../lib/storage';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]/files
// Cursor-based pagination, search by name, filter by MIME type prefix
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // T-06-12: auth() check — userId from session only
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-10: scope project lookup with userId
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const url = req.nextUrl;
  const search = url.searchParams.get('search') ?? '';
  const type = url.searchParams.get('type') ?? '';
  const cursor = url.searchParams.get('cursor') ?? '';

  const PAGE_SIZE = 20;

  // Build filter
  const filter: Record<string, unknown> = {
    projectId: project._id,
    status: 'UPLOADED',
    deletedAt: null,
  };

  // Escape regex special chars to prevent ReDoS attacks
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (type) {
    // e.g. "image" matches "image/png", "image/jpeg"
    filter.type = { $regex: `^${escapeRegex(type)}/`, $options: 'i' };
  }

  // Clone base filter for total count before cursor constraint
  const baseFilter = { ...filter };

  // Cursor pagination: fetch items before this _id (newest-first)
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const [files, totalCount] = await Promise.all([
    File.find(filter).sort({ _id: -1 }).limit(PAGE_SIZE + 1).lean(),
    File.countDocuments(baseFilter),
  ]);

  const hasMore = files.length > PAGE_SIZE;
  const resultFiles = hasMore ? files.slice(0, PAGE_SIZE) : files;
  const lastFile = resultFiles[resultFiles.length - 1];
  const nextCursor = hasMore && lastFile ? String(lastFile._id) : null;

  return NextResponse.json({ files: resultFiles, nextCursor, hasMore, totalCount });
}

// DELETE /api/internal/projects/[slug]/files
// Bulk soft-delete: body { fileIds: string[] }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // T-06-12: auth() guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-10: scope project lookup with userId
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fileIds: string[] =
    body !== null &&
    typeof body === 'object' &&
    'fileIds' in body &&
    Array.isArray((body as { fileIds: unknown }).fileIds)
      ? (body as { fileIds: unknown[] }).fileIds.filter(
          (id): id is string => typeof id === 'string',
        )
      : [];

  if (fileIds.length === 0) {
    return NextResponse.json({ error: 'No file IDs provided' }, { status: 400 });
  }

  // T-06-11: validate ALL fileIds belong to the authenticated user's project
  const validIds = fileIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Fetch the owned files with key + size so we can both delete from R2
  // and decrement storage usage accurately.
  const ownedFiles = await File.find({
    _id: { $in: validIds },
    projectId: project._id,
    deletedAt: null,
  })
    .select('_id key size')
    .lean();

  // T-06-11: if any ID doesn't belong to this project, reject the whole request
  if (ownedFiles.length !== validIds.length) {
    return NextResponse.json(
      { error: 'One or more files not found or not accessible' },
      { status: 403 },
    );
  }

  // Delete each object from R2 in parallel. DeleteObject is idempotent (204
  // regardless of key existence) so only transient errors should fail here.
  const r2Results = await Promise.allSettled(
    ownedFiles.map((file) =>
      r2Client.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key }),
      ),
    ),
  );

  // Only soft-delete the DB rows whose R2 object was successfully removed —
  // leaves failing ones intact so the user can retry.
  const successIds: mongoose.Types.ObjectId[] = [];
  let reclaimedBytes = 0;
  const failures: { id: string; key: string }[] = [];

  r2Results.forEach((result, idx) => {
    const file = ownedFiles[idx]!;
    if (result.status === 'fulfilled') {
      successIds.push(file._id);
      reclaimedBytes += file.size ?? 0;
    } else {
      failures.push({ id: String(file._id), key: file.key });
      console.warn(
        `[files.delete] R2 DeleteObject failed for key=${file.key}:`,
        result.reason,
      );
    }
  });

  if (successIds.length === 0) {
    return NextResponse.json(
      { error: 'Failed to delete files from storage', failures },
      { status: 502 },
    );
  }

  // Soft-delete DB rows + mark status DELETED (mirrors public v1 API)
  await File.updateMany(
    { _id: { $in: successIds }, projectId: project._id },
    { $set: { deletedAt: new Date(), status: 'DELETED' } },
  );

  // Decrement storage usage for the current period (atomic $inc)
  if (reclaimedBytes > 0) {
    const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    await UsageRecord.findOneAndUpdate(
      { userId: project.userId, period },
      { $inc: { storageUsed: -reclaimedBytes } },
      { upsert: true },
    );
  }

  return NextResponse.json({
    deleted: successIds.length,
    failed: failures.length,
    reclaimedBytes,
  });
}
