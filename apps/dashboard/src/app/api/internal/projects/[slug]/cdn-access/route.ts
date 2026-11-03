import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { syncCdnAccessMarker, type CdnAccess } from '../../../../../../lib/cdn-access';

export const dynamic = 'force-dynamic';

const Body = z.object({ access: z.enum(['public', 'signed']) });

// PUT /api/internal/projects/[slug]/cdn-access  { access: 'public' | 'signed' }
// Ordering guarantees the worker never enforces signing while the dashboard/API
// still hand out unsigned URLs (an extra ?exp/sig on a public worker is harmless):
//  - public -> signed: DB first (URLs start being signed), then marker (worker enforces); revert DB on failure.
//  - signed -> public: marker removed first (worker stops enforcing), then DB.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'access must be "public" or "signed"' }, { status: 400 });
  }
  const target: CdnAccess = parsed.data.access;

  const { slug } = await params;
  await connectDB();
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (target === 'signed' && !process.env.IMAGE_TRANSFORM_SECRET) {
    return NextResponse.json({ error: 'Signed CDN access is not configured on this server' }, { status: 503 });
  }

  const filter = { _id: project._id, userId: session.user.id };
  const previous: CdnAccess = project.cdnAccess ?? 'public';
  const id = String(project._id);

  try {
    if (target === 'signed') {
      await Project.findOneAndUpdate(filter, { $set: { cdnAccess: 'signed' } });
      try {
        await syncCdnAccessMarker(id, 'signed');
      } catch (err) {
        await Project.findOneAndUpdate(filter, { $set: { cdnAccess: previous } }).catch(() => undefined);
        throw err;
      }
    } else {
      await syncCdnAccessMarker(id, 'public');
      try {
        await Project.findOneAndUpdate(filter, { $set: { cdnAccess: 'public' } });
      } catch (err) {
        if (previous === 'signed') await syncCdnAccessMarker(id, 'signed').catch(() => undefined);
        throw err;
      }
    }
  } catch (err) {
    console.error('[cdn-access] failed to update project', err);
    return NextResponse.json({ error: 'Failed to update CDN access' }, { status: 502 });
  }

  return NextResponse.json({ cdnAccess: target });
}
