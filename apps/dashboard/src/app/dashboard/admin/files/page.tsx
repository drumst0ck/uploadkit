import Link from 'next/link';
import { connectDB, File, Project, User } from '@uploadkitdev/db';
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

interface FileRow {
  _id: string;
  name: string;
  size: number;
  type: string;
  status: string;
  key: string;
  createdAt: Date;
  projectSlug: string | null;
  projectName: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerId: string | null;
}

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; limit?: string }>;
}) {
  await connectDB();
  const { q, status, sort, limit } = await searchParams;

  const match: Record<string, unknown> = {};
  if (q && q.trim()) {
    match.name = { $regex: q.trim(), $options: 'i' };
  }
  if (status && status !== 'ALL') {
    match.status = status;
  }

  const sortOption: Record<string, 1 | -1> =
    sort === 'size' ? { size: -1 as const }
    : sort === '-size' ? { size: 1 as const }
    : sort === 'name' ? { name: 1 as const }
    : { _id: -1 as const };

  const fileLimit = Math.min(parseInt(limit ?? '200', 10) || 200, 1000);

  const files = await File.find(match).sort(sortOption).limit(fileLimit).lean();

  const projectIds = [...new Set(files.map((f) => String(f.projectId)))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id slug name userId')
    .lean();
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  const userIds = [...new Set(projects.map((p) => String(p.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id email name')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const rows: FileRow[] = files.map((f) => {
    const project = projectMap.get(String(f.projectId));
    const owner = project ? userMap.get(String(project.userId)) : null;
    return {
      _id: String(f._id),
      name: f.name,
      size: f.size,
      type: f.type,
      status: f.status,
      key: f.key,
      createdAt: f.createdAt,
      projectSlug: project?.slug ?? null,
      projectName: project?.name ?? null,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      ownerId: owner ? String(owner._id) : null,
    };
  });

  const totalSize = rows.reduce((acc, r) => acc + r.size, 0);

  const statusColors: Record<string, string> = {
    UPLOADED: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    UPLOADING: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    FAILED: 'bg-red-500/10 text-red-400 ring-red-500/20',
    DELETED: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Files
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} file{rows.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} total · from {projectIds.length} project{projectIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by filename"
          className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? 'ALL'}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          <option value="UPLOADED">UPLOADED</option>
          <option value="UPLOADING">UPLOADING</option>
          <option value="FAILED">FAILED</option>
          <option value="DELETED">DELETED</option>
        </select>
        <select
          name="sort"
          defaultValue={sort ?? '-createdAt'}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
        >
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="size">Largest first</option>
          <option value="-size">Smallest first</option>
          <option value="name">Name A-Z</option>
        </select>
        <select
          name="limit"
          defaultValue={limit ?? '200'}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
        >
          <option value="50">50 files</option>
          <option value="200">200 files</option>
          <option value="500">500 files</option>
          <option value="1000">1000 files</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          Filter
        </button>
        {(q || (status && status !== 'ALL') || sort) && (
          <Link
            href="/dashboard/admin/files"
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
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Owner</TableHead>
              <TableHead className="text-muted-foreground">Project</TableHead>
              <TableHead className="text-muted-foreground">Size</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No files match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r._id} className="border-border hover:bg-accent">
                  <TableCell className="font-medium text-foreground truncate max-w-[200px]" title={r.name}>
                    {r.projectSlug ? (
                      <Link
                        href={`/dashboard/projects/${r.projectSlug}/files`}
                        className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                  </TableCell>
                  <TableCell>
                    {r.ownerId ? (
                      <Link
                        href={`/dashboard/admin/users/${r.ownerId}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="block truncate max-w-[160px]" title={r.ownerEmail ?? undefined}>
                          {r.ownerName ?? r.ownerEmail ?? '—'}
                        </span>
                        {r.ownerName && r.ownerEmail && (
                          <span className="block text-[10px] text-muted-foreground/60 truncate max-w-[160px]">
                            {r.ownerEmail}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.projectName ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatBytes(r.size)}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={r.type}>
                    {r.type}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                        statusColors[r.status] ?? statusColors.UPLOADED
                      }`}
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Showing {rows.length} of up to {fileLimit} files.
        </div>
      )}
    </div>
  );
}