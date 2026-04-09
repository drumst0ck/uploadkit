import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import { connectDB, UsageRecord, Subscription } from '@uploadkit/db';
import { TIER_LIMITS } from '@uploadkit/shared';
import type { Tier } from '@uploadkit/shared';
import { UsageProgressBar } from '../../../components/usage-progress-bar';
import { UsageBarChart } from '../../../components/charts/usage-bar-chart';
import { formatBytes, formatNumber } from '../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  const userId = session.user.id;

  // Determine current billing period
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get tier from subscription
  const subscription = await Subscription.findOne({ userId }).lean();
  const tier: Tier = subscription?.tier ?? 'FREE';
  const limits = TIER_LIMITS[tier];

  // Current period usage
  const current = await UsageRecord.findOne({ userId, period: currentPeriod }).lean();
  const storageUsed = current?.storageUsed ?? 0;
  const bandwidthUsed = current?.bandwidth ?? 0;
  const uploadsUsed = current?.uploads ?? 0;

  // 6-month history for the chart
  const history = await UsageRecord.find({ userId })
    .sort({ period: -1 })
    .limit(6)
    .lean();

  const chartData = history.map((r) => ({
    period: r.period,
    storageUsed: r.storageUsed,
    bandwidth: r.bandwidth,
    uploads: r.uploads,
  }));

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Usage</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Current billing period: {periodLabel}
        </p>
      </div>

      {/* Tier badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Plan:</span>
        <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20">
          {tier}
        </span>
      </div>

      {/* Progress bars — DASH-08: 3 bars against TIER_LIMITS */}
      <div className="rounded-xl border border-white/[0.06] bg-card p-6">
        <h2 className="mb-6 text-sm font-medium text-zinc-300">Resource Usage</h2>
        <div className="flex flex-col gap-6">
          <UsageProgressBar
            label="Storage"
            used={storageUsed}
            limit={limits.maxStorageBytes}
            formatFn={formatBytes}
          />
          <UsageProgressBar
            label="Bandwidth"
            used={bandwidthUsed}
            limit={limits.maxBandwidthBytes}
            formatFn={formatBytes}
          />
          <UsageProgressBar
            label="Uploads this month"
            used={uploadsUsed}
            limit={limits.maxUploadsPerMonth}
            formatFn={formatNumber}
          />
        </div>
      </div>

      {/* Historical chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-300">6-Month History</h2>
          <UsageBarChart data={chartData} />
        </div>
      )}

      {chartData.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-card p-6">
          <h2 className="mb-2 text-sm font-medium text-zinc-300">6-Month History</h2>
          <p className="text-sm text-zinc-500">No historical data yet. Usage records will appear here once you start uploading files.</p>
        </div>
      )}
    </div>
  );
}
