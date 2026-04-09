import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, File } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]/logs
// Returns upload log entries with optional filtering by since, status.
// T-06-13: auth() guard — userId from session, scoped to project owner.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // Scope to authenticated user's project
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const url = req.nextUrl;

  // since: ISO timestamp — defaults to 24h ago on the client, but accept it here
  const sinceParam = url.searchParams.get('since');
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // status: UPLOADING | UPLOADED | FAILED
  const statusParam = url.searchParams.get('status');

  const filter: Record<string, unknown> = {
    projectId: project._id,
    createdAt: { $gte: since },
    // Exclude hard-deleted files from logs
    deletedAt: null,
  };

  if (statusParam && ['UPLOADING', 'UPLOADED', 'FAILED'].includes(statusParam)) {
    filter.status = statusParam;
  }

  const files = await File.find(filter)
    .sort({ _id: -1 })
    .limit(100)
    .select('_id name size type status createdAt uploadedBy')
    .lean();

  return NextResponse.json(files);
}
