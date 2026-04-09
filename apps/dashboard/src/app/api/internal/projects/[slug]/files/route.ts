import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, File } from '@uploadkit/db';

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

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  if (type) {
    // e.g. "image" matches "image/png", "image/jpeg"
    filter.type = { $regex: `^${type}/`, $options: 'i' };
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

  const ownedCount = await File.countDocuments({
    _id: { $in: validIds },
    projectId: project._id,
    deletedAt: null,
  });

  // T-06-11: if any ID doesn't belong to this project, reject the whole request
  if (ownedCount !== validIds.length) {
    return NextResponse.json(
      { error: 'One or more files not found or not accessible' },
      { status: 403 },
    );
  }

  const result = await File.updateMany(
    { _id: { $in: validIds }, projectId: project._id },
    { $set: { deletedAt: new Date() } },
  );

  return NextResponse.json({ deleted: result.modifiedCount });
}
