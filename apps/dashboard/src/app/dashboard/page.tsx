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

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPeriod = prevDate.toISOString().slice(0, 7);

  const [usage, prevUsage, totalFiles, todayUploads, recentFiles, rawChartData] =
    await Promise.all([
      UsageRecord.findOne({ userId, period: currentPeriod }).lean(),
      UsageRecord.findOne({ userId, period: prevPeriod }).lean(),
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

  function computeTrend(
    current: number,
    previous: number
  ): { value: number; label: string } | undefined {
    if (previous === 0)
      return current > 0 ? { value: 100, label: 'from last month' } : undefined;
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: pct, label: 'from last month' };
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
      </div>

      {/* 4 Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Storage Used"
          value={formatBytes(usage?.storageUsed ?? 0)}
          icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage?.storageUsed ?? 0, prevUsage?.storageUsed ?? 0)}
        />
        <MetricCard
          label="Bandwidth"
          value={formatBytes(usage?.bandwidth ?? 0)}
          icon={<ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage?.bandwidth ?? 0, prevUsage?.bandwidth ?? 0)}
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
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-foreground">Uploads — Last 30 Days</h2>
          <Link href="/dashboard/projects" className="text-xs text-foreground0 hover:text-foreground transition-colors">
            All Projects
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Daily upload activity across all your projects.
        </p>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No uploads in the last 30 days.</p>
          </div>
        ) : (
          <UploadsAreaChart data={chartData} />
        )}
      </div>

      {/* Recent files table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Recent Files</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your 5 most recently uploaded files.
            </p>
          </div>
          {userProjects[0] != null && (
            <Link
              href={`/dashboard/projects/${userProjects[0].slug}/files`}
              className="text-xs text-foreground0 hover:text-foreground transition-colors"
            >
              View All →
            </Link>
          )}
        </div>
        {recentFiles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground0">Name</TableHead>
                <TableHead className="text-foreground0">Size</TableHead>
                <TableHead className="text-foreground0">Type</TableHead>
                <TableHead className="text-foreground0">Status</TableHead>
                <TableHead className="text-foreground0">Date</TableHead>
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
                    className="border-border hover:bg-accent"
                  >
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={fileLink}
                        className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
                      >
                        {file.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(file.size)}
                    </TableCell>
                    <TableCell className="text-foreground0 font-mono text-xs">
                      {file.type}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {file.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground0">
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
