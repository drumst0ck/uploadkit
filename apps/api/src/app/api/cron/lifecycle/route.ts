import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/secure-compare';
import { deleteStoredFile } from '@/lib/delete-stored-file';
import { connectDB, Project, File } from '@uploadkitdev/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/lifecycle
 * Deletes files past project retention policy. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
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
      .select('key size status uploadId')
      .lean();

    if (stale.length === 0) continue;

    await Promise.allSettled(
      stale.map(async (file) => {
        if (!file.key) return;
        try {
          // Recheck status when claiming: a concurrent run may already have deleted it.
          if (await deleteStoredFile(file, project.userId, 'UPLOADED')) deleted++;
        } catch (err) {
          console.warn(`[lifecycle] DeleteObject failed for key=${file.key}:`, err);
        }
      }),
    );

  }

  return NextResponse.json({ ok: true, deleted });
}
