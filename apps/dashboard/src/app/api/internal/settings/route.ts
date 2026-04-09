import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectDB, User, Project, File, ApiKey } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// GET /api/internal/settings
// Returns the authenticated user's profile data.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('name email image')
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT /api/internal/settings
// Updates the user's profile name.
// T-06-14: only name field is updatable; userId from session, never from request body.
export async function PUT(req: NextRequest) {
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
      : null;

  // T-06-14: validate name 1-100 chars
  if (name === null || name.length === 0 || name.length > 100) {
    return NextResponse.json(
      { error: 'Name must be between 1 and 100 characters.' },
      { status: 400 },
    );
  }

  await connectDB();

  const updated = await User.findByIdAndUpdate(
    session.user.id,
    { $set: { name } },
    { new: true, select: 'name email image' },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/internal/settings
// Permanently deletes the authenticated user's account and all associated data.
// T-06-15: destructive action — requires client-side typed email confirmation before calling.
// Logs deletion event before executing for audit trail.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  await connectDB();

  // Fetch user's projects to cascade delete files and API keys
  const projects = await Project.find({ userId }).select('_id').lean();
  const projectIds = projects.map((p) => p._id);

  // Log deletion event before executing (T-06-15: repudiation mitigation)
  console.info('[account-deletion]', {
    userId,
    projectCount: projectIds.length,
    timestamp: new Date().toISOString(),
  });

  // Cascade delete: files → API keys → projects → user
  if (projectIds.length > 0) {
    await File.deleteMany({ projectId: { $in: projectIds } });
    await ApiKey.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ userId });
  }

  await User.findByIdAndDelete(userId);

  return NextResponse.json({ deleted: true });
}
