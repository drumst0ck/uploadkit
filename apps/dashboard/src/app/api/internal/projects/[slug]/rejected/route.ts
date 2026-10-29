import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, UploadRejection } from '@uploadkitdev/db';
import {
  DEFAULT_REJECTED_RANGE,
  REJECTED_MAX_ROUTER_LENGTH,
  REJECTED_PAGE_SIZE,
  REJECTED_RANGES,
  isPlanLimitRejection,
  isRejectedRange,
} from '../../../../../../lib/rejections';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]/rejected?range=7d|24h|1h&router=<slug>&page=1
// Non-dismissed rejections of the owner's project, newest first. Never returns userId.
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

  // Scope project lookup with userId: other users' projects are indistinguishable from missing ones
  const project = await Project.findOne({ slug, userId: session.user.id }).select('_id').lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const rangeParam = sp.get('range') ?? DEFAULT_REJECTED_RANGE;
  if (!isRejectedRange(rangeParam)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }
  const routerParam = sp.get('router') ?? '';
  if (routerParam.length > REJECTED_MAX_ROUTER_LENGTH) {
    return NextResponse.json({ error: 'Invalid router' }, { status: 400 });
  }
  const pageRaw = sp.get('page') ?? '1';
  const page = /^\d{1,6}$/.test(pageRaw) ? Number(pageRaw) : 0;
  if (page < 1) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
  }

  const since = new Date(Date.now() - REJECTED_RANGES[rangeParam].ms);
  const base = {
    projectId: project._id,
    createdAt: { $gte: since },
    dismissedAt: null,
  };
  const filter = routerParam ? { ...base, routerSlug: routerParam } : base;

  const [rows, total, routers] = await Promise.all([
    UploadRejection.find(filter)
      .select('routerSlug fileName fileSize fileType code reason createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * REJECTED_PAGE_SIZE)
      .limit(REJECTED_PAGE_SIZE)
      .lean(),
    UploadRejection.countDocuments(filter),
    // Router options come from the window, ignoring the router filter itself
    UploadRejection.distinct('routerSlug', base),
  ]);

  return NextResponse.json({
    rejections: rows.map((r) => ({
      id: String(r._id),
      fileName: r.fileName,
      fileSize: r.fileSize,
      fileType: r.fileType,
      routerSlug: r.routerSlug,
      code: r.code,
      reason: r.reason,
      planLimit: isPlanLimitRejection(r.code, r.reason),
      createdAt: r.createdAt,
    })),
    routers: (routers as string[]).sort((a, b) => a.localeCompare(b)),
    total,
    page,
    pageSize: REJECTED_PAGE_SIZE,
    hasMore: page * REJECTED_PAGE_SIZE < total,
  });
}
