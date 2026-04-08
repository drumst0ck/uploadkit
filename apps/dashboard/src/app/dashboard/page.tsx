import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HardDrive, ArrowUpDown, Upload, FileText } from 'lucide-react';
import { auth } from '../../../auth';
import { connectDB, UsageRecord, File, Project } from '@uploadkit/db';
import { MetricCard } from '../../components/metric-card';
import { UploadsAreaChart } from '../../components/charts/uploads-area-chart';
import { formatBytes, formatDate, formatNumber } from '../../lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uploadkit/ui';

// Force dynamic rendering — auth() and connectDB() require runtime env vars
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id;
  await connectDB();

  const now = new Date();
  const currentPeriod = now.toISOString().slice(0, 7); // "YYYY-MM"

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Get user's project IDs to scope file queries
  // IFile model links files via projectId, not userId directly
  const userProjects = await Project.find({ userId }).select('_id slug').lean();
  const projectIds = userProjects.map((p) => p._id);
  const projectSlugMap = new Map(
    userProjects.map((p) => [String(p._id), p.slug])
  );

  const [usage, totalFiles, todayUploads, recentFiles, rawChartData] =
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

  const chartData = rawChartData.map((d) => ({
    date: d._id,
    uploads: d.uploads,
  }));

  const greeting = session.user.name
    ? `Welcome, ${session.user.name}`
    : 'Welcome';

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">{greeting}</h1>
        <p className="text-zinc-400 text-sm">
          Here&apos;s an overview of your usage this month.
        </p>
      </div>

      {/* 4 Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Storage Used"
          value={formatBytes(usage?.storageUsed ?? 0)}
          icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Bandwidth"
          value={formatBytes(usage?.bandwidth ?? 0)}
          icon={<ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Uploads Today"
          value={formatNumber(todayUploads)}
          icon={<Upload className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Total Files"
          value={formatNumber(totalFiles)}
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      {/* Upload area chart */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-1">
          Uploads — Last 30 Days
        </h2>
        <p className="text-xs text-zinc-600 mb-6">
          Daily upload activity across all your projects.
        </p>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-zinc-600">No uploads in the last 30 days.</p>
          </div>
        ) : (
          <UploadsAreaChart data={chartData} />
        )}
      </div>

      {/* Recent files table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141416] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-zinc-300">Recent Files</h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            Your 5 most recently uploaded files.
          </p>
        </div>
        {recentFiles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-zinc-600">No files uploaded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-zinc-500">Name</TableHead>
                <TableHead className="text-zinc-500">Size</TableHead>
                <TableHead className="text-zinc-500">Type</TableHead>
                <TableHead className="text-zinc-500">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentFiles.map((file) => {
                const slug = projectSlugMap.get(String(file.projectId));
                const fileLink = slug
                  ? `/dashboard/projects/${slug}/files`
                  : '/dashboard/projects';
                return (
                  <TableRow
                    key={String(file._id)}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell className="font-medium text-zinc-200">
                      <Link
                        href={fileLink}
                        className="hover:text-white hover:underline underline-offset-4 transition-colors"
                      >
                        {file.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {formatBytes(file.size)}
                    </TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs">
                      {file.type}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDate(file.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
