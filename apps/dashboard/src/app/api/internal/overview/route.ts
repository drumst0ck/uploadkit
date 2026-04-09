import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectDB, UsageRecord, File, Project } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  // T-06-07: auth() guard — all queries filtered by userId from session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  await connectDB();

  const now = new Date();
  const currentPeriod = now.toISOString().slice(0, 7); // "YYYY-MM"

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Get user's project IDs to scope file queries (IFile uses projectId, not userId directly)
  const userProjects = await Project.find({ userId }).select('_id').lean();
  const projectIds = userProjects.map((p) => p._id);

  const [usage, totalFiles, todayUploads, recentFiles, chartData] =
    await Promise.all([
      UsageRecord.findOne({ userId, period: currentPeriod }).lean(),
      File.countDocuments({
        projectId: { $in: projectIds },
        status: 'UPLOADED',
        deletedAt: null,
      }),
      File.countDocuments({
        projectId: { $in: projectIds },
        status: 'UPLOADED',
        createdAt: { $gte: startOfToday },
      }),
      File.find({
        projectId: { $in: projectIds },
        status: 'UPLOADED',
        deletedAt: null,
      })
        .sort({ _id: -1 })
        .limit(5)
        .lean(),
      File.aggregate<{ _id: string; uploads: number }>([
        {
          $match: {
            projectId: { $in: projectIds },
            status: 'UPLOADED',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            uploads: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  return NextResponse.json({
    storage: usage?.storageUsed ?? 0,
    bandwidth: usage?.bandwidth ?? 0,
    todayUploads,
    totalFiles,
    recentFiles,
    chartData: chartData.map((d) => ({ date: d._id, uploads: d.uploads })),
  });
}
