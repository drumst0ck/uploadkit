import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { auth } from '../../../../../../auth';
import { connectDB, Project, ApiKey, File, FileRouter } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]
// Returns project details scoped to the authenticated user (T-06-17).
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

  // T-06-17: scope lookup to userId — prevents cross-user access
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

// PUT /api/internal/projects/[slug]
// Renames the project. Re-derives slug server-side. Validates name 1-50 chars.
// T-06-19: userId from session only, slug re-derived server-side.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name =
    body !== null &&
    typeof body === 'object' &&
    'name' in body &&
    typeof (body as { name: unknown }).name === 'string'
      ? (body as { name: string }).name.trim()
      : '';

  // T-06-19: validate name length 1-50 chars
  if (name.length === 0 || name.length > 50) {
    return NextResponse.json(
      { error: 'Project name must be between 1 and 50 characters.' },
      { status: 400 },
    );
  }

  await connectDB();

  // T-06-17: scope lookup to userId
  const project = await Project.findOne({ slug, userId: session.user.id });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // T-06-19: re-derive slug server-side from new name + nanoid for uniqueness
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const newSlug = `${baseSlug || 'project'}-${nanoid(6)}`;

  project.name = name;
  project.slug = newSlug;
  await project.save();

  return NextResponse.json({ name: project.name, slug: project.slug });
}

// DELETE /api/internal/projects/[slug]
// Permanently deletes project and all associated files, API keys, and file routers.
// T-06-17: verify project belongs to session.user.id before deletion.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-17: scope lookup to userId — elevation of privilege guard
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const projectId = project._id;

  // Log deletion event before executing (audit trail)
  console.info('[project-deletion]', {
    projectId: String(projectId),
    slug,
    userId: session.user.id,
    timestamp: new Date().toISOString(),
  });

  // Cascade delete: files → API keys → file routers → project
  await File.deleteMany({ projectId });
  await ApiKey.deleteMany({ projectId });
  await FileRouter.deleteMany({ projectId });
  await Project.deleteOne({ _id: projectId });

  // Return redirect guidance — client will navigate to /dashboard/projects
  return NextResponse.json({ redirect: '/dashboard/projects' });
}
