import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, File, Project, Subscription } from '@uploadkitdev/db';
import { TIER_LIMITS } from '@uploadkitdev/shared';
import type { Tier } from '@uploadkitdev/shared';
import { FileBrowser } from '../../../../../components/file-browser/file-browser';
import { share } from '../../../../../components/overview/meter';
import { formatBytes, formatNumber } from '../../../../../lib/format';

export const dynamic = 'force-dynamic';

interface FilesPageProps {
  params: Promise<{ slug: string }>;
}

function UsageTile({
  project,
  label,
  used,
  limit,
  kind,
}: {
  project: string;
  label: string;
  used: number;
  limit: number;
  kind: 'bytes' | 'count';
}) {
  const fmt = (n: number) => (kind === 'bytes' ? formatBytes(n) : formatNumber(n));
  const pct = share(used, limit);
  const pctText = pct === null ? null : pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
  const limitText = Number.isFinite(limit) ? fmt(limit) : null;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {pctText && limitText ? `${pctText} of ${limitText}` : 'No limit'}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[1.0625rem] tabular-nums">{fmt(used)}</div>
      {pct !== null ? (
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"
          role="meter"
          aria-label={`${project} ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={`${fmt(used)}, ${pctText} of the plan limit`}
        >
          <i className="block h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).select('name slug').lean();
  if (!project) notFound();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const live = { projectId: project._id, status: 'UPLOADED' as const, deletedAt: null };

  const [subscription, totals, uploadsThisMonth, listedCount] = await Promise.all([
    Subscription.findOne({ userId: session.user.id }).lean(),
    File.aggregate<{ bytes: number }>([
      { $match: live },
      { $group: { _id: null, bytes: { $sum: '$size' } } },
    ]),
    File.countDocuments({ ...live, createdAt: { $gte: startOfMonth } }),
    // Same rows the table lists: uploaded and still uploading, never failed or deleted
    File.countDocuments({ projectId: project._id, status: { $in: ['UPLOADED', 'UPLOADING'] }, deletedAt: null }),
  ]);

  const tier: Tier = subscription?.tier ?? 'FREE';
  const limits = TIER_LIMITS[tier];
  const bytes = totals[0]?.bytes ?? 0;
  
  const usage = (
    <section
      aria-label={`${project.name} usage this month`}
      className="grid gap-x-10 gap-y-5 rounded-md bg-card px-5 py-4 md:grid-cols-[150px_repeat(2,minmax(0,1fr))]"
    >
      <div className="text-sm text-muted-foreground">
        {project.name} usage
        <br />
        this month
        <br />
        <Link href="/dashboard/usage" className="hover:text-foreground hover:underline">
          Usage details &rarr;
        </Link>
      </div>
      <UsageTile project={project.name} label="Storage" used={bytes} limit={limits.maxStorageBytes} kind="bytes" />
      <UsageTile project={project.name} label="Uploads" used={uploadsThisMonth} limit={limits.maxUploadsPerMonth} kind="count" />
    </section>
  );

  return (
    <FileBrowser
      slug={slug}
      projectName={project.name}
      fileCount={listedCount}
      totalBytes={bytes}
      usage={usage}
    />
  );
}
