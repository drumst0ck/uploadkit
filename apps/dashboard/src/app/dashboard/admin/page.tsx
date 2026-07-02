import Link from 'next/link';
import { Users, FileText, HardDrive, CreditCard } from 'lucide-react';
import { connectDB, User, File, Subscription } from '@uploadkitdev/db';
import { MetricCard } from '../../../components/metric-card';
import { UploadsAreaChart } from '../../../components/charts/uploads-area-chart';
import { formatDate, splitBytes } from '../../../lib/format';
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

  const [
    totalUsers,
    prevTotalUsersRaw,
    paidSubscriptions,
    totalFiles,
    uploadsToday,
    storageAgg,
    uploadsAggRaw,
    paidUsersPrevPeriodRaw,
    recentSignups,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $lt: new Date(now.getFullYear(), now.getMonth(), 1) } }),
    Subscription.countDocuments({
      tier: { $ne: 'FREE' },
      status: { $in: ['ACTIVE', 'TRIALING'] },
    }),
    File.countDocuments({ status: 'UPLOADED', deletedAt: null }),
    File.countDocuments({ status: 'UPLOADED', createdAt: { $gte: startOfToday } }),
    File.aggregate<{ totalSize: number }>([
      { $match: { status: 'UPLOADED', deletedAt: null } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]),
    File.aggregate<{ _id: string; uploads: number }>([
      { $match: { status: 'UPLOADED', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          uploads: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Subscription.countDocuments({
      tier: { $ne: 'FREE' },
      status: { $in: ['ACTIVE', 'TRIALING'] },
      currentPeriodStart: { $lt: new Date(now.getFullYear(), now.getMonth(), 1) },
    }),
    User.find({}).sort({ _id: -1 }).limit(5).lean(),
  ]);

  const chartData = uploadsAggRaw.map((d) => ({ date: d._id, uploads: d.uploads }));
  const totalStorage = storageAgg[0]?.totalSize ?? 0;
  const storage = splitBytes(totalStorage);

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
          Platform-wide metrics across all users and projects.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={totalUsers}
          decimals={0}
          delay={0}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(totalUsers, prevTotalUsersRaw)}
        />
        <MetricCard
          label="Paid Subscriptions"
          value={paidSubscriptions}
          decimals={0}
          delay={0.1}
          icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
          trend={computeTrend(paidSubscriptions, paidUsersPrevPeriodRaw)}
        />
        <MetricCard
          label="Total Files"
          value={totalFiles}
          decimals={0}
          delay={0.2}
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Storage Used"
          value={storage.value}
          suffix={storage.unit}
          decimals={1}
          delay={0.3}
          icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

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
          {uploadsToday} uploads today · daily volume across the entire platform.
        </p>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No uploads in the last 30 days.</p>
          </div>
        ) : (
          <UploadsAreaChart data={chartData} />
        )}
      </div>

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
                  <TableCell className="font-medium text-foreground">{u.name ?? '—'}</TableCell>
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
    </div>
  );
}
