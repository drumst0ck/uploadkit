import Link from 'next/link';
import { connectDB, Subscription, User } from '@uploadkitdev/db';
import { formatDate } from '../../../../lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uploadkitdev/ui';

export const dynamic = 'force-dynamic';

const TIER_BADGE_CLASS: Record<string, string> = {
  FREE: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  PRO: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  TEAM: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  ENTERPRISE: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  TRIALING: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  PAST_DUE: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  CANCELED: 'bg-red-500/10 text-red-400 ring-red-500/20',
};

export default async function AdminSubscriptionsPage() {
  await connectDB();

  const subs = await Subscription.find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const userIds = [...new Set(subs.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id email name')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const byTier = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.tier] = (acc[s.tier] ?? 0) + 1;
    return acc;
  }, {});
  const byStatus = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const canceledCount = byStatus.CANCELED ?? 0;
  const activeCount = (byStatus.ACTIVE ?? 0) + (byStatus.TRIALING ?? 0);
  const churnRate = subs.length > 0 ? Math.round((canceledCount / subs.length) * 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subs.length} total · {activeCount} active · {canceledCount} canceled · {churnRate}% churn
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {(['FREE', 'PRO', 'TEAM', 'ENTERPRISE'] as const).map((tier) => (
          <div
            key={tier}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <p className="text-xs text-muted-foreground">{tier}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{byTier[tier] ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">subscriptions</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">User</TableHead>
              <TableHead className="text-muted-foreground">Tier</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Cancel at EoP</TableHead>
              <TableHead className="text-muted-foreground">Current Period</TableHead>
              <TableHead className="text-muted-foreground">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No subscriptions yet.
                </TableCell>
              </TableRow>
            ) : (
              subs.map((s) => {
                const user = userMap.get(String(s.userId));
                return (
                  <TableRow key={String(s._id)} className="border-border hover:bg-accent">
                    <TableCell>
                      <div className="font-medium text-foreground">{user?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{user?.email ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                          TIER_BADGE_CLASS[s.tier] ?? TIER_BADGE_CLASS.FREE
                        }`}
                      >
                        {s.tier}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                          STATUS_BADGE_CLASS[s.status] ?? STATUS_BADGE_CLASS.ACTIVE
                        }`}
                      >
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.cancelAtPeriodEnd ? 'Yes' : 'No'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.currentPeriodStart && s.currentPeriodEnd
                        ? `${formatDate(s.currentPeriodStart)} → ${formatDate(s.currentPeriodEnd)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-foreground">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
