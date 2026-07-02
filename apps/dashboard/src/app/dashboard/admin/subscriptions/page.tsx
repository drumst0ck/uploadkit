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

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; status?: string }>;
}) {
  await connectDB();
  const { q, tier, status } = await searchParams;

  const filter: Record<string, unknown> = {};
  if (tier && tier !== 'ALL') filter.tier = tier;
  if (status && status !== 'ALL') filter.status = status;

  const subs = await Subscription.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const userIds = [...new Set(subs.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id email name')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  // Filter by user email/name if q is present
  let filteredSubs = subs;
  if (q && q.trim()) {
    const lower = q.trim().toLowerCase();
    filteredSubs = subs.filter((s) => {
      const u = userMap.get(String(s.userId));
      return (
        u?.email?.toLowerCase().includes(lower) ||
        u?.name?.toLowerCase().includes(lower)
      );
    });
  }

  const byTier = filteredSubs.reduce<Record<string, number>>((acc, s) => {
    acc[s.tier] = (acc[s.tier] ?? 0) + 1;
    return acc;
  }, {});
  const byStatus = filteredSubs.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const canceledCount = byStatus.CANCELED ?? 0;
  const activeCount = (byStatus.ACTIVE ?? 0) + (byStatus.TRIALING ?? 0);
  const churnRate = filteredSubs.length > 0
    ? Math.round((canceledCount / filteredSubs.length) * 100)
    : 0;
  const pastDueCount = byStatus.PAST_DUE ?? 0;

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filteredSubs.length} total · {activeCount} active · {canceledCount} canceled · {pastDueCount} past due · {churnRate}% churn
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {(['FREE', 'PRO', 'TEAM', 'ENTERPRISE'] as const).map((t) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">{t}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{byTier[t] ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">subscriptions</p>
            <Link
              href={`/dashboard/admin/subscriptions?tier=${t}`}
              className="mt-2 inline-block text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Filter →
            </Link>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by user name or email"
          className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
        />
        <select
          name="tier"
          defaultValue={tier ?? 'ALL'}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All tiers</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="TEAM">TEAM</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? 'ALL'}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="TRIALING">TRIALING</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          Filter
        </button>
        {(q || (tier && tier !== 'ALL') || (status && status !== 'ALL')) && (
          <Link
            href="/dashboard/admin/subscriptions"
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
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
              <TableHead className="text-muted-foreground">Stripe Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubs.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No subscriptions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubs.map((s) => {
                const user = userMap.get(String(s.userId));
                return (
                  <TableRow key={String(s._id)} className="border-border hover:bg-accent">
                    <TableCell>
                      <Link
                        href={`/dashboard/admin/subscriptions/${String(s._id)}`}
                        className="group"
                      >
                        <div className="font-medium text-foreground group-hover:underline underline-offset-2 transition-colors">
                          {user?.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{user?.email ?? '—'}</div>
                      </Link>
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
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {s.currentPeriodStart && s.currentPeriodEnd
                        ? `${formatDate(s.currentPeriodStart)} → ${formatDate(s.currentPeriodEnd)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {s.stripeCustomerId ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}