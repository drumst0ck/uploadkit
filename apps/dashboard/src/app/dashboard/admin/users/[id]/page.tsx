import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, User, Project, File, Subscription, UsageRecord, ApiKey, Account } from '@uploadkitdev/db';
import { formatBytes, formatDate } from '../../../../../lib/format';
import { Badge } from '@uploadkitdev/ui';
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
  NONE: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  await connectDB();
  const { id } = await params;

  const user = await User.findById(id).lean();
  if (!user) notFound();

  const [projects, subscription, usageRecords, apiKeys, accounts, files] = await Promise.all([
    Project.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    Subscription.findOne({ userId: user._id }).lean(),
    UsageRecord.find({ userId: user._id }).sort({ period: -1 }).lean(),
    ApiKey.find({ projectId: { $in: (await Project.find({ userId: user._id }).select('_id').lean()).map((p) => p._id) } }).sort({ createdAt: -1 }).lean(),
    Account.find({ userId: user._id }).lean(),
    File.find({
      projectId: { $in: (await Project.find({ userId: user._id }).select('_id').lean()).map((p) => p._id) },
      deletedAt: null,
    }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const filesByProject = new Map<string, number>();
  let totalFileSize = 0;
  for (const f of files) {
    const pid = String(f.projectId);
    filesByProject.set(pid, (filesByProject.get(pid) ?? 0) + 1);
    totalFileSize += f.size;
  }

  const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastLogin = user.lastLoginAt
    ? Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to users
      </Link>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-foreground">
            {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {user.name ?? 'Unnamed User'}
              </h1>
              {user.emailVerified && (
                <Badge variant="secondary" className="text-[10px]">Verified</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email ?? 'No email'}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>ID: <code className="font-mono text-foreground">{String(user._id)}</code></span>
              <span>Account age: <span className="text-foreground">{accountAge} days</span></span>
              {daysSinceLastLogin !== null && (
                <span>Last login: <span className="text-foreground">{daysSinceLastLogin === 0 ? 'Today' : `${daysSinceLastLogin} days ago`}</span></span>
              )}
              <span>Joined: <span className="text-foreground">{formatDate(user.createdAt)}</span></span>
            </div>
          </div>
          {subscription && (
            <div className="shrink-0 text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${TIER_BADGE_CLASS[subscription.tier] ?? TIER_BADGE_CLASS.FREE}`}>
                {subscription.tier}
              </span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 sm:grid-cols-5 sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="text-lg font-semibold text-foreground">{projects.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Files</p>
            <p className="text-lg font-semibold text-foreground">{files.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Storage</p>
            <p className="text-lg font-semibold text-foreground">{formatBytes(totalFileSize)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">API Keys</p>
            <p className="text-lg font-semibold text-foreground">{apiKeys.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accounts</p>
            <p className="text-lg font-semibold text-foreground">{accounts.length}</p>
          </div>
        </div>

        {/* Notifications */}
        {user.notifications && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground mb-1.5">Notification Preferences</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Usage alerts: <span className="text-foreground">{user.notifications.emailUsageAlerts ? '✓' : '✗'}</span></span>
              <span>Product updates: <span className="text-foreground">{user.notifications.emailProductUpdates ? '✓' : '✗'}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Subscription card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Subscription</h2>
          {subscription && (
            <Link
              href={`/dashboard/admin/subscriptions/${String(subscription._id)}`}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View Details →
            </Link>
          )}
        </div>
        {subscription ? (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Tier</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 mt-1 ${TIER_BADGE_CLASS[subscription.tier] ?? TIER_BADGE_CLASS.FREE}`}>
                {subscription.tier}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 mt-1 ${STATUS_BADGE_CLASS[subscription.status] ?? STATUS_BADGE_CLASS.NONE}`}>
                {subscription.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-1 text-foreground">{formatDate(subscription.createdAt)}</p>
            </div>
            {subscription.currentPeriodStart && (
              <div>
                <p className="text-xs text-muted-foreground">Period Start</p>
                <p className="mt-1 text-foreground">{formatDate(subscription.currentPeriodStart)}</p>
              </div>
            )}
            {subscription.currentPeriodEnd && (
              <div>
                <p className="text-xs text-muted-foreground">Period End</p>
                <p className="mt-1 text-foreground">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Cancel at Period End</p>
              <p className="mt-1 text-foreground">{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
            </div>
            {subscription.stripeCustomerId && (
              <div>
                <p className="text-xs text-muted-foreground">Stripe Customer</p>
                <p className="mt-1 font-mono text-xs text-foreground">{subscription.stripeCustomerId}</p>
              </div>
            )}
            {subscription.stripeSubscriptionId && (
              <div>
                <p className="text-xs text-muted-foreground">Stripe Subscription</p>
                <p className="mt-1 font-mono text-xs text-foreground">{subscription.stripeSubscriptionId}</p>
              </div>
            )}
            {subscription.stripePriceId && (
              <div>
                <p className="text-xs text-muted-foreground">Stripe Price</p>
                <p className="mt-1 font-mono text-xs text-foreground">{subscription.stripePriceId}</p>
              </div>
            )}
            {subscription.imageTransformLimit !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Image Transform Limit</p>
                <p className="mt-1 text-foreground">{subscription.imageTransformLimit.toLocaleString()}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No subscription record found.</p>
        )}
      </div>

      {/* Usage Records */}
      {usageRecords.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-foreground">Usage History</h2>
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

      {/* Projects */}
      {projects.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-foreground">Projects ({projects.length})</h2>
          <div className="mt-4 space-y-2">
            {projects.map((p) => {
              const fileCount = filesByProject.get(String(p._id)) ?? 0;
              const projectFiles = files.filter((f) => String(f.projectId) === String(p._id));
              const projectSize = projectFiles.reduce((acc, f) => acc + f.size, 0);
              return (
                <div key={String(p._id)} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/projects/${p.slug}`}
                      className="text-sm font-medium text-foreground hover:underline underline-offset-2 transition-colors"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      slug: <code className="font-mono">{p.slug}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span>{fileCount} files</span>
                    <span className="font-mono">{formatBytes(projectSize)}</span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent files */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent Files ({files.length})</h2>
            <Link
              href={`/dashboard/admin/files?q=${encodeURIComponent(user.email ?? '')}`}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all in Files →
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Size</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={String(f._id)} className="border-border">
                    <TableCell className="font-medium text-foreground truncate max-w-[200px]">
                      {f.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatBytes(f.size)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{f.type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                        {f.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* API Keys */}
      {apiKeys.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-foreground">API Keys ({apiKeys.length})</h2>
          <div className="mt-4 space-y-2">
            {apiKeys.map((k) => (
              <div key={String(k._id)} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm">
                <div>
                  <span className="text-foreground font-medium">{k.name}</span>
                  <code className="ml-2 font-mono text-xs text-muted-foreground">{k.keyPrefix}...</code>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {k.isTest ? 'Test' : 'Live'}
                  </span>
                  {k.revokedAt && (
                    <span className="ml-2 text-[10px] text-red-400">Revoked</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {k.lastUsedAt ? `Last used ${formatDate(k.lastUsedAt)}` : 'Never used'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account providers */}
      {accounts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-foreground">Connected Accounts ({accounts.length})</h2>
          <div className="mt-4 space-y-2">
            {accounts.map((a) => (
              <div key={String(a._id)} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium capitalize">{a.provider}</span>
                  <code className="font-mono text-xs text-muted-foreground">{a.providerAccountId}</code>
                </div>
                <div className="text-xs text-muted-foreground">{a.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for users with no data at all */}
      {projects.length === 0 && files.length === 0 && apiKeys.length === 0 && accounts.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            This user has no projects, files, API keys, or connected accounts yet.
          </p>
        </div>
      )}
    </div>
  );
}