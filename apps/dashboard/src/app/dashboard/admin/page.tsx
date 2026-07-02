import Link from 'next/link';
import { Users, FileText, HardDrive, CreditCard, Activity, UserPlus, AlertTriangle } from 'lucide-react';
import { connectDB, User, File, Subscription, UsageRecord, Project } from '@uploadkitdev/db';
import { MetricCard } from '../../../components/metric-card';
import { UploadsAreaChart } from '../../../components/charts/uploads-area-chart';
import { formatDate, splitBytes, formatBytes } from '../../../lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uploadkitdev/ui';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await connectDB();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalUsers,
    prevUsers,
    paidSubscriptions,
    prevPaidSubs,
    totalFiles,
    filesYesterday,
    uploadsToday,
    storageAgg,
    uploadsAggRaw,
    recentSignups,
    subsWithoutStripe,
    usersWithoutSubscription,
    topStorageUsers,
    usageThisMonth,
    usageLastMonth,
    projectsLastMonth,
    projectsThisMonth,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $lt: startOfThisMonth } }),
    Subscription.countDocuments({ tier: { $ne: 'FREE' }, status: { $in: ['ACTIVE', 'TRIALING'] } }),
    Subscription.countDocuments({
      tier: { $ne: 'FREE' },
      status: { $in: ['ACTIVE', 'TRIALING'] },
      currentPeriodStart: { $lt: startOfThisMonth },
    }),
    File.countDocuments({ status: 'UPLOADED', deletedAt: null }),
    File.countDocuments({ status: 'UPLOADED', deletedAt: null, createdAt: { $lt: startOfToday, $gte: new Date(now.getTime() - 86400000 * 2) } }),
    File.countDocuments({ status: 'UPLOADED', createdAt: { $gte: startOfToday } }),
    File.aggregate<{ totalSize: number }>([
      { $match: { status: 'UPLOADED', deletedAt: null } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]),
    File.aggregate<{ _id: string; uploads: number }>([
      { $match: { status: 'UPLOADED', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, uploads: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.find({}).sort({ _id: -1 }).limit(5).lean(),
    Subscription.countDocuments({ stripeCustomerId: { $exists: false }, tier: { $ne: 'FREE' } }),
    User.countDocuments({
      _id: { $nin: (await Subscription.find({}).distinct('userId')) },
    }),
    File.aggregate<{ _id: string; totalSize: number; fileCount: number; projectId: string }>([
      { $match: { status: 'UPLOADED', deletedAt: null } },
      { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } },
      { $unwind: '$project' },
      { $group: { _id: '$project.userId', totalSize: { $sum: '$size' }, fileCount: { $sum: 1 } } },
      { $sort: { totalSize: -1 } },
      { $limit: 10 },
    ]),
    UsageRecord.aggregate<{ totalUploads: number; totalStorage: number; totalBandwidth: number; totalTransforms: number }>([
      { $match: { period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` } },
      { $group: { _id: null, totalUploads: { $sum: '$uploads' }, totalStorage: { $sum: '$storageUsed' }, totalBandwidth: { $sum: '$bandwidth' }, totalTransforms: { $sum: '$imageTransforms' } } },
    ]),
    UsageRecord.aggregate<{ totalUploads: number; totalStorage: number; totalBandwidth: number; totalTransforms: number }>([
      { $match: { period: `${startOfLastMonth.getFullYear()}-${String(startOfLastMonth.getMonth() + 1).padStart(2, '0')}` } },
      { $group: { _id: null, totalUploads: { $sum: '$uploads' }, totalStorage: { $sum: '$storageUsed' }, totalBandwidth: { $sum: '$bandwidth' }, totalTransforms: { $sum: '$imageTransforms' } } },
    ]),
    Project.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Project.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
  ]);

  const chartData = uploadsAggRaw.map((d) => ({ date: d._id, uploads: d.uploads }));
  const totalStorage = storageAgg[0]?.totalSize ?? 0;
  const storage = splitBytes(totalStorage);

  const topUserIds = topStorageUsers.map((u) => u._id);
  const topUsersMap = new Map(
    (await User.find({ _id: { $in: topUserIds } }).select('_id email name').lean()).map((u) => [String(u._id), u]),
  );

  const usage = usageThisMonth[0] ?? { totalUploads: 0, totalStorage: 0, totalBandwidth: 0, totalTransforms: 0 };
  const prevUsage = usageLastMonth[0] ?? { totalUploads: 0, totalStorage: 0, totalBandwidth: 0, totalTransforms: 0 };

  function computeTrend(current: number, previous: number) {
    if (previous === 0) return current > 0 ? { value: 100, label: 'vs last month' } : undefined;
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: pct, label: 'vs last month' };
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Admin Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide metrics across all users, projects and files.
        </p>
      </div>

      {/* Row 1: Core metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={totalUsers}
          decimals={0}
          delay={0}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(totalUsers, prevUsers)}
        />
        <MetricCard
          label="Paid Subscriptions"
          value={paidSubscriptions}
          decimals={0}
          delay={0.1}
          icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(paidSubscriptions, prevPaidSubs)}
        />
        <MetricCard
          label="Total Files"
          value={totalFiles}
          decimals={0}
          delay={0.2}
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage.totalUploads, prevUsage.totalUploads)}
        />
        <MetricCard
          label="Storage Used"
          value={storage.value}
          suffix={storage.unit}
          decimals={1}
          delay={0.3}
          icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage.totalStorage, prevUsage.totalStorage)}
        />
      </div>

      {/* Row 2: Usage & alerts */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Uploads This Month"
          value={usage.totalUploads}
          decimals={0}
          delay={0.4}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage.totalUploads, prevUsage.totalUploads)}
        />
        <MetricCard
          label="Bandwidth This Month"
          value={splitBytes(usage.totalBandwidth).value}
          suffix={splitBytes(usage.totalBandwidth).unit}
          decimals={1}
          delay={0.5}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage.totalBandwidth, prevUsage.totalBandwidth)}
        />
        <MetricCard
          label="Image Transforms"
          value={usage.totalTransforms}
          decimals={0}
          delay={0.6}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(usage.totalTransforms, prevUsage.totalTransforms)}
        />
        <MetricCard
          label="New Projects"
          value={projectsThisMonth}
          decimals={0}
          delay={0.7}
          icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(projectsThisMonth, projectsLastMonth)}
        />
      </div>

      {/* Alerts row */}
      {(subsWithoutStripe > 0 || usersWithoutSubscription > 0) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Anomalies Detected</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-300/80">
            {subsWithoutStripe > 0 && (
              <li>
                {subsWithoutStripe} paid subscription{subsWithoutStripe !== 1 ? 's' : ''} missing Stripe customer ID — possible billing issues.
              </li>
            )}
            {usersWithoutSubscription > 0 && (
              <li>
                {usersWithoutSubscription} user{usersWithoutSubscription !== 1 ? 's' : ''} without any subscription record — missing sign-up flow.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Uploads chart */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Uploads — Last 30 Days</h2>
          <Link
            href="/dashboard/admin/files"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            All Files
          </Link>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">
          {uploadsToday} uploads today · {filesYesterday} yesterday · daily volume across the entire platform.
        </p>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No uploads in the last 30 days.</p>
          </div>
        ) : (
          <UploadsAreaChart data={chartData} />
        )}
      </div>

      {/* Two-column section */}
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        {/* Recent Signups */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-medium text-foreground">Recent Signups</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Latest 5 users to join UploadKit.
            </p>
          </div>
          {recentSignups.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No users yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Joined</TableHead>
                  <TableHead className="text-muted-foreground">Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((u) => (
                  <TableRow key={String(u._id)} className="border-border hover:bg-accent">
                    <TableCell>
                      <Link
                        href={`/dashboard/admin/users/${String(u._id)}`}
                        className="font-medium text-foreground hover:underline underline-offset-2 transition-colors"
                      >
                        {u.name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Top Users by Storage */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-medium text-foreground">Top Users by Storage</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Users consuming the most storage across all projects.
            </p>
          </div>
          {topStorageUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">#</TableHead>
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Files</TableHead>
                  <TableHead className="text-muted-foreground">Storage</TableHead>
                  <TableHead className="text-muted-foreground">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStorageUsers.map((u, i) => {
                  const user = topUsersMap.get(String(u._id));
                  return (
                    <TableRow key={String(u._id)} className="border-border hover:bg-accent">
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/admin/users/${String(u._id)}`}
                          className="font-medium text-foreground hover:underline underline-offset-2 transition-colors"
                        >
                          {user?.name ?? user?.email ?? 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.fileCount}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatBytes(u.totalSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {totalStorage > 0
                          ? `${((u.totalSize / totalStorage) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}