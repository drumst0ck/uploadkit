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
  createdAt: Date;
  projectSlug: string | null;
  ownerEmail: string | null;
}

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await connectDB();
  const { q, status } = await searchParams;

  const match: Record<string, unknown> = {};
  if (q && q.trim()) {
    match.name = { $regex: q.trim(), $options: 'i' };
  }
  if (status && status !== 'ALL') {
    match.status = status;
  }

  const files = await File.find(match).sort({ _id: -1 }).limit(200).lean();

  const projectIds = [...new Set(files.map((f) => String(f.projectId)))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id slug userId')
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
      createdAt: f.createdAt,
      projectSlug: project?.slug ?? null,
      ownerEmail: owner?.email ?? null,
    };
  });

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Files
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest 200 uploads across all projects.
        </p>
      </div>

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
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Owner</TableHead>
              <TableHead className="text-muted-foreground">Size</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No files match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r._id} className="border-border hover:bg-accent">
                  <TableCell className="font-medium text-foreground">
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
                  <TableCell className="text-muted-foreground">{r.ownerEmail ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatBytes(r.size)}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{r.type}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))
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
