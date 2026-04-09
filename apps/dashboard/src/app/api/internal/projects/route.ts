import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { auth } from '../../../../../auth';
import { connectDB, Project, FileRouter } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects — list all projects for the authenticated user
export async function GET() {
  // T-06-05: auth() guard — userId comes from session, never from request
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const projects = await Project.find({ userId: session.user.id })
    .sort({ _id: -1 })
    .lean();

  return NextResponse.json(projects);
}

// POST /api/internal/projects — create a new project
export async function POST(req: NextRequest) {
  // T-06-05: auth() guard — userId from session, not from request body
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // T-06-08: validate name length 1-50 chars
  if (name.length === 0 || name.length > 50) {
    return NextResponse.json(
      { error: 'Project name must be between 1 and 50 characters.' },
      { status: 400 }
    );
  }

  await connectDB();

  // Generate slug: lowercase, spaces → hyphens, strip non-alphanumeric-hyphen chars,
  // then append nanoid(6) for guaranteed uniqueness (T-06-06)
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const slug = `${baseSlug || 'project'}-${nanoid(6)}`;

  const project = await Project.create({
    name,
    slug,
    userId: session.user.id,
  });

  // Create default FileRouter so user can upload immediately
  await FileRouter.create({
    slug: 'default',
    projectId: project._id,
    maxFileSize: 52428800, // 50MB
    maxFileCount: 100,
    allowedTypes: ['*/*'],
  });

  return NextResponse.json(project, { status: 201 });
}
