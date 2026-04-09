import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectDB, Project, File } from '@uploadkit/db';

export const dynamic = 'force-dynamic';

// GET /api/internal/search?q=query&limit=10
// Searches files by name across all user projects.
// T-06-18: results capped at 10 items, debouncing handled client-side (300ms).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl;
  const q = (url.searchParams.get('q') ?? '').trim();
  const limitParam = url.searchParams.get('limit');
  // T-06-18: hard cap at 10 results
  const limit = Math.min(parseInt(limitParam ?? '10', 10) || 10, 10);

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  await connectDB();

  // Fetch user's project IDs to scope file search (never expose other users' files)
  const userProjects = await Project.find({ userId: session.user.id })
    .select('_id slug')
    .lean();

  if (userProjects.length === 0) {
    return NextResponse.json([]);
  }

  const projectIdToSlug = new Map(
    userProjects.map((p) => [String(p._id), p.slug]),
  );
  const projectIds = userProjects.map((p) => p._id);

  // Case-insensitive substring match on file name, non-deleted files only
  const files = await File.find({
    projectId: { $in: projectIds },
    name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    deletedAt: null,
    status: 'UPLOADED',
  })
    .select('_id name projectId')
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  const results = files.map((f) => ({
    _id: String(f._id),
    name: f.name,
    projectId: String(f.projectId),
    projectSlug: projectIdToSlug.get(String(f.projectId)) ?? '',
  }));

  return NextResponse.json(results);
}
