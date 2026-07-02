import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Project, File } from '@uploadkitdev/db';
import { deleteR2Objects } from '@/lib/r2-delete';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/lifecycle
 * Deletes files past project retention policy. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const xCronSecret = req.headers.get('x-cron-secret');
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!cronSecret || (xCronSecret !== cronSecret && bearerToken !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const projects = await Project.find({
    'lifecyclePolicy.enabled': true,
    'lifecyclePolicy.retentionDays': { $gt: 0 },
  }).lean();

  let deleted = 0;

  for (const project of projects) {
    const days = project.lifecyclePolicy?.retentionDays ?? 0;
    if (days <= 0) continue;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stale = await File.find({
      projectId: project._id,
      status: 'UPLOADED',
      createdAt: { $lt: cutoff },
    })
      .select('key')
      .lean();

    if (stale.length === 0) continue;

    const keys = stale.map((f) => f.key).filter(Boolean);
    await deleteR2Objects(keys);
    await File.updateMany(
      { _id: { $in: stale.map((f) => f._id) } },
      { status: 'DELETED', deletedAt: new Date() },
    );
    deleted += stale.length;
  }

  return NextResponse.json({ ok: true, deleted });
}
