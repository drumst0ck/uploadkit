import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, FileRouter } from '@uploadkit/db';

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
  const maxFileSize = typeof b['maxFileSize'] === 'number' ? b['maxFileSize'] : 4194304;
  const maxFileCount = typeof b['maxFileCount'] === 'number' ? b['maxFileCount'] : 1;
  const webhookUrl = typeof b['webhookUrl'] === 'string' ? b['webhookUrl'].trim() : undefined;

  if (!routeSlug) {
    return NextResponse.json({ error: 'Route slug is required' }, { status: 400 });
  }

  // Validate uniqueness within project
  const existing = await FileRouter.findOne({ projectId: project._id, slug: routeSlug });
  if (existing) {
    return NextResponse.json(
      { error: `A route with slug "${routeSlug}" already exists in this project` },
      { status: 409 },
    );
  }

  const route = await FileRouter.create({
    slug: routeSlug,
    projectId: project._id,
    allowedTypes,
    maxFileSize,
    maxFileCount,
    ...(webhookUrl !== undefined ? { webhookUrl } : {}),
  });

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
  if (typeof b['slug'] === 'string') updates['slug'] = b['slug'].trim();
  if (Array.isArray(b['allowedTypes'])) {
    updates['allowedTypes'] = (b['allowedTypes'] as unknown[]).filter(
      (t): t is string => typeof t === 'string',
    );
  }
  if (typeof b['maxFileSize'] === 'number') updates['maxFileSize'] = b['maxFileSize'];
  if (typeof b['maxFileCount'] === 'number') updates['maxFileCount'] = b['maxFileCount'];
  if (typeof b['webhookUrl'] === 'string') updates['webhookUrl'] = b['webhookUrl'];

  // T-06-10: verify route belongs to this project before update
  const updated = await FileRouter.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(routeId), projectId: project._id },
    { $set: updates },
    { new: true },
  );

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
