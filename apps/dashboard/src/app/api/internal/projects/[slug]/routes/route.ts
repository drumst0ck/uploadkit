import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, FileRouter } from '@uploadkitdev/db';
import { TIER_LIMITS, validateWebhookUrl } from '@uploadkitdev/shared';
import { getUserTier } from '../../../../../../lib/tier';

const MAX_FILE_COUNT = 1000;

/** undefined → not provided; Error string → invalid; number → valid positive integer. */
function positiveInt(value: unknown): number | undefined | string {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return 'must be a positive integer';
  return value;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]/routes
// Returns all file router configs for the project.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const routes = await FileRouter.find({ projectId: project._id })
    .sort({ _id: -1 })
    .lean();

  return NextResponse.json(routes);
}

// POST /api/internal/projects/[slug]/routes
// Creates a new file router config.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

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

  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const routeSlug = typeof b['slug'] === 'string' ? b['slug'].trim() : '';
  const allowedTypes = Array.isArray(b['allowedTypes'])
    ? (b['allowedTypes'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const sizeIn = positiveInt(b['maxFileSize']);
  const countIn = positiveInt(b['maxFileCount']);
  const webhookUrl = typeof b['webhookUrl'] === 'string' ? b['webhookUrl'].trim() : undefined;

  if (!routeSlug) {
    return NextResponse.json({ error: 'Route slug is required' }, { status: 400 });
  }
  if (typeof sizeIn === 'string') {
    return NextResponse.json({ error: `maxFileSize ${sizeIn}` }, { status: 400 });
  }
  if (typeof countIn === 'string') {
    return NextResponse.json({ error: `maxFileCount ${countIn}` }, { status: 400 });
  }
  if (webhookUrl) {
    const webhookError = validateWebhookUrl(webhookUrl);
    if (webhookError) return NextResponse.json({ error: webhookError }, { status: 400 });
  }
  // Bound to the plan: the effective limit is already min(route, tier), so clamp what is stored.
  const tierMaxSize = TIER_LIMITS[await getUserTier(session.user.id)].maxFileSizeBytes;
  const maxFileSize = Math.min(sizeIn ?? 4194304, tierMaxSize);
  const maxFileCount = Math.min(countIn ?? 1, MAX_FILE_COUNT);

  // Validate uniqueness within project
  const existing = await FileRouter.findOne({ projectId: project._id, slug: routeSlug });
  if (existing) {
    return NextResponse.json(
      { error: `A route with slug "${routeSlug}" already exists in this project` },
      { status: 409 },
    );
  }

  let route;
  try {
    route = await FileRouter.create({
      slug: routeSlug,
      projectId: project._id,
      allowedTypes,
      maxFileSize,
      maxFileCount,
      ...(webhookUrl !== undefined ? { webhookUrl } : {}),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      return NextResponse.json(
        { error: `A route with slug "${routeSlug}" already exists in this project` },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(route, { status: 201 });
}

// PUT /api/internal/projects/[slug]/routes
// Updates an existing router by _id.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

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

  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const routeId = typeof b['_id'] === 'string' ? b['_id'] : '';

  if (!routeId || !mongoose.isValidObjectId(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof b['slug'] === 'string') {
    const newSlug = b['slug'].trim();
    if (!newSlug) return NextResponse.json({ error: 'Route slug is required' }, { status: 400 });
    updates['slug'] = newSlug;
  }
  if (Array.isArray(b['allowedTypes'])) {
    updates['allowedTypes'] = (b['allowedTypes'] as unknown[]).filter(
      (t): t is string => typeof t === 'string',
    );
  }
  const sizeIn = positiveInt(b['maxFileSize']);
  const countIn = positiveInt(b['maxFileCount']);
  if (typeof sizeIn === 'string') {
    return NextResponse.json({ error: `maxFileSize ${sizeIn}` }, { status: 400 });
  }
  if (typeof countIn === 'string') {
    return NextResponse.json({ error: `maxFileCount ${countIn}` }, { status: 400 });
  }
  if (sizeIn !== undefined) {
    updates['maxFileSize'] = Math.min(sizeIn, TIER_LIMITS[await getUserTier(session.user.id)].maxFileSizeBytes);
  }
  if (countIn !== undefined) updates['maxFileCount'] = Math.min(countIn, MAX_FILE_COUNT);
  if (typeof b['webhookUrl'] === 'string') {
    const url = b['webhookUrl'].trim();
    if (url) {
      const webhookError = validateWebhookUrl(url);
      if (webhookError) return NextResponse.json({ error: webhookError }, { status: 400 });
    }
    updates['webhookUrl'] = url;
  }

  if (typeof updates['slug'] === 'string') {
    const clash = await FileRouter.findOne({
      projectId: project._id,
      slug: updates['slug'],
      _id: { $ne: new mongoose.Types.ObjectId(routeId) },
    });
    if (clash) {
      return NextResponse.json(
        { error: `A route with slug "${updates['slug']}" already exists in this project` },
        { status: 409 },
      );
    }
  }

  // T-06-10: verify route belongs to this project before update
  let updated;
  try {
    updated = await FileRouter.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(routeId), projectId: project._id },
      { $set: updates },
      { new: true },
    );
  } catch (err) {
    if (isDuplicateKey(err)) {
      return NextResponse.json({ error: 'A route with that slug already exists in this project' }, { status: 409 });
    }
    throw err;
  }

  if (!updated) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/internal/projects/[slug]/routes
// Deletes a route config.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

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

  const routeId =
    body !== null &&
    typeof body === 'object' &&
    '_id' in body &&
    typeof (body as { _id: unknown })['_id'] === 'string'
      ? (body as { _id: string })['_id']
      : '';

  if (!routeId || !mongoose.isValidObjectId(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  // T-06-10: verify ownership before delete
  const deleted = await FileRouter.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(routeId),
    projectId: project._id,
  });

  if (!deleted) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
