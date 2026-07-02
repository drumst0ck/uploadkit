import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, Subscription, User, UsageRecord } from '@uploadkitdev/db';
import { formatDate, formatBytes } from '../../../../../lib/format';
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSubscriptionDetailPage({ params }: Props) {
  await connectDB();
  const { id } = await params;

  const subscription = await Subscription.findById(id).lean();
  if (!subscription) notFound();

  const user = await User.findById(subscription.userId).select('_id name email image createdAt lastLoginAt').lean();
  const usageRecords = await UsageRecord.find({ userId: subscription.userId }).sort({ period: -1 }).limit(12).lean();

  const now = new Date();

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/admin/subscriptions"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to subscriptions
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Subscription Details
              </h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TIER_BADGE_CLASS[subscription.tier]}`}>
                {subscription.tier}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${STATUS_BADGE_CLASS[subscription.status]}`}>
                {subscription.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ID: {String(subscription._id)} · Created {formatDate(subscription.createdAt)}
            </p>
          </div>
          {user && (
            <Link
              href={`/dashboard/admin/users/${String(user._id)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium">
                {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-medium text-xs">{user.name ?? 'Unnamed'}</div>
                <div className="text-[10px] text-muted-foreground">{user.email}</div>
              </div>
            </Link>
          )}
        </div>

        {/* Key-value grid */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {user && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">User Name</p>
                <p className="mt-1 text-foreground">{user.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User Email</p>
                <p className="mt-1 text-foreground">{user.email ?? '—'}</p>
              </div>
              {user.lastLoginAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="mt-1 text-foreground">{formatDate(user.lastLoginAt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">User Since</p>
                <p className="mt-1 text-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Tier</p>
            <p className="mt-1 text-foreground">{subscription.tier}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-foreground">{subscription.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cancel at Period End</p>
            <p className="mt-1 text-foreground">{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Image Transform Limit</p>
            <p className="mt-1 text-foreground">
              {subscription.imageTransformLimit !== undefined
                ? subscription.imageTransformLimit.toLocaleString()
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Period Start</p>
            <p className="mt-1 text-foreground">
              {subscription.currentPeriodStart
                ? formatDate(subscription.currentPeriodStart)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Period End</p>
            <p className="mt-1 text-foreground">
              {subscription.currentPeriodEnd
                ? formatDate(subscription.currentPeriodEnd)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days Remaining</p>
            <p className="mt-1 text-foreground">
              {subscription.currentPeriodEnd
                ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) + ' days'
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subscription Duration</p>
            <p className="mt-1 text-foreground">
              {Math.floor((now.getTime() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        </div>

        {/* Stripe info */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs font-medium text-foreground mb-3">Stripe Integration</p>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Customer ID</p>
              <p className="mt-0.5 font-mono text-xs text-foreground">
                {subscription.stripeCustomerId ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Subscription ID</p>
              <p className="mt-0.5 font-mono text-xs text-foreground">
                {subscription.stripeSubscriptionId ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Price ID</p>
              <p className="mt-0.5 font-mono text-xs text-foreground">
                {subscription.stripePriceId ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage history */}
      {usageRecords.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-foreground">Usage History</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last {usageRecords.length} billing periods.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Period</TableHead>
                  <TableHead className="text-muted-foreground">Storage</TableHead>
                  <TableHead className="text-muted-foreground">Bandwidth</TableHead>
                  <TableHead className="text-muted-foreground">Uploads</TableHead>
                  <TableHead className="text-muted-foreground">Transforms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageRecords.map((r) => (
                  <TableRow key={r.period} className="border-border">
                    <TableCell className="font-medium text-foreground">{r.period}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatBytes(r.storageUsed ?? 0)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatBytes(r.bandwidth ?? 0)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.uploads ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{r.imageTransforms ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}