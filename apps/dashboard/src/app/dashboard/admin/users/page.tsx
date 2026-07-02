import Link from 'next/link';
import { connectDB, User, Project, File, Subscription } from '@uploadkitdev/db';
import { formatBytes, formatDate } from '../../../../lib/format';
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

interface UserRow {
  _id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  projectCount: number;
  fileCount: number;
  totalSize: number;
  tier: string;
  status: string;
  subCreatedAt: Date | null;
  emailVerified: boolean;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; status?: string; sort?: string }>;
}) {
  await connectDB();
  const { q, tier, status, sort } = await searchParams;

  const filter: Record<string, unknown> = {};
  if (q && q.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: 'i' } },
      { email: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  const sortOption: Record<string, 1 | -1> =
    sort === 'name' ? { name: 1 as const }
    : sort === '-name' ? { name: -1 as const }
    : sort === 'email' ? { email: 1 as const }
    : sort === '-email' ? { email: -1 as const }
    : { createdAt: -1 as const };

  const users = await User.find(filter).sort(sortOption).limit(500).lean();

  const userIds = users.map((u) => u._id);

  const allProjects = await Project.find({ userId: { $in: userIds } }).select('_id userId').lean();

  const projectsByUser = new Map<string, unknown[]>();
  for (const p of allProjects) {
    const key = String(p.userId);
    const arr = projectsByUser.get(key) ?? [];
    arr.push(p._id);
    projectsByUser.set(key, arr);
  }
  const allProjectIds = allProjects.map((p) => p._id);

  const [fileAggs, subscriptions] = await Promise.all([
    File.aggregate<{ _id: unknown; count: number; totalSize: number }>([
      { $match: { deletedAt: null, projectId: { $in: allProjectIds } } },
      { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } },
      { $unwind: '$project' },
      { $group: { _id: '$project.userId', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
    ]),
    Subscription.find({ userId: { $in: userIds } }).select('userId tier status createdAt').lean(),
  ]);

  const projectMap = new Map<string, number>();
  for (const p of allProjects) {
    const key = String(p.userId);
    projectMap.set(key, (projectMap.get(key) ?? 0) + 1);
  }
  const fileMap = new Map(
    fileAggs.map((f) => [String(f._id), { count: f.count, totalSize: f.totalSize }]),
  );
  const subMap = new Map(subscriptions.map((s) => [String(s.userId), s]));

  let rows: UserRow[] = users.map((u) => {
    const sub = subMap.get(String(u._id));
    return {
      _id: String(u._id),
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
      projectCount: projectMap.get(String(u._id)) ?? 0,
      fileCount: fileMap.get(String(u._id))?.count ?? 0,
      totalSize: fileMap.get(String(u._id))?.totalSize ?? 0,
      tier: sub?.tier ?? 'FREE',
      status: sub?.status ?? 'NONE',
      subCreatedAt: sub?.createdAt ?? null,
      emailVerified: !!u.emailVerified,
    };
  });

  if (tier && tier !== 'ALL') {
    rows = rows.filter((r) => r.tier === tier);
  }
  if (status && status !== 'ALL') {
    rows = rows.filter((r) => r.status === status);
  }

  const totalStorage = rows.reduce((acc, r) => acc + r.totalSize, 0);
  const usersWithSubscription = rows.filter((r) => r.tier !== 'FREE').length;
  const verifiedUsers = rows.filter((r) => r.emailVerified).length;

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} users · {verifiedUsers} verified · {usersWithSubscription} paid · {formatBytes(totalStorage)} total storage
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email"
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
            <option value="NONE">NONE</option>
          </select>
          <select
            name="sort"
            defaultValue={sort ?? '-createdAt'}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
          >
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="-name">Name Z-A</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
          >
            Filter
          </button>
          {(q || (tier && tier !== 'ALL') || (status && status !== 'ALL')) && (
            <Link
              href="/dashboard/admin/users"
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">User</TableHead>
              <TableHead className="text-muted-foreground">Tier</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Projects</TableHead>
              <TableHead className="text-muted-foreground">Files</TableHead>
              <TableHead className="text-muted-foreground">Storage</TableHead>
              <TableHead className="text-muted-foreground">Verified</TableHead>
              <TableHead className="text-muted-foreground">Last Login</TableHead>
              <TableHead className="text-muted-foreground">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  No users match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r._id} className="border-border hover:bg-accent">
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/users/${r._id}`}
                      className="flex items-center gap-2.5 group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-foreground">
                        {(r.name ?? r.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground group-hover:underline underline-offset-2 transition-colors truncate">
                          {r.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{r.email ?? '—'}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                        TIER_BADGE_CLASS[r.tier] ?? TIER_BADGE_CLASS.FREE
                      }`}
                    >
                      {r.tier}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.status}</TableCell>
                  <TableCell className="text-muted-foreground">{r.projectCount}</TableCell>
                  <TableCell className="text-muted-foreground">{r.fileCount}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{formatBytes(r.totalSize)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.emailVerified ? '✓' : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.lastLoginAt ? formatDate(r.lastLoginAt) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}