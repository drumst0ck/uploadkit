import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../auth';
import { connectDB, UsageRecord, UploadRejection, File, Project, Subscription } from '@uploadkitdev/db';
import { TIER_LIMITS } from '@uploadkitdev/shared';
import type { Tier } from '@uploadkitdev/shared';
import { NewProjectButton } from '../../components/overview/new-project-button';
import { CopyUrlButton } from '../../components/overview/copy-url-button';
import { MeterRow, MiniLine } from '../../components/overview/meter';
import { formatBytes, formatNumber, formatRelative } from '../../lib/format';

// Force dynamic rendering — auth() and connectDB() require runtime env vars
export const dynamic = 'force-dynamic';

const TIER_LABEL: Record<Tier, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  TEAM: 'Team',
  ENTERPRISE: 'Enterprise',
};

const STATUS_WORD: Record<string, { word: string; dot: string }> = {
  UPLOADED: { word: 'Uploaded', dot: 'pd-dot--success' },
  UPLOADING: { word: 'Uploading', dot: 'pd-dot--warning' },
  FAILED: { word: 'Failed', dot: 'pd-dot--danger' },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id;
  await connectDB();

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // IFile links files via projectId, not userId directly
  const projects = await Project.find({ userId }).select('name slug').sort({ createdAt: 1 }).lean();
  const projectIds = projects.map((p) => p._id);
  const projectById = new Map(projects.map((p) => [String(p._id), p]));

  const liveFiles = { projectId: { $in: projectIds }, status: 'UPLOADED', deletedAt: null };

  const [subscription, usage, storageByProject, uploadsByProject, failedByProject, recentFiles] =
    await Promise.all([
      Subscription.findOne({ userId }).lean(),
      UsageRecord.findOne({ userId, period: currentPeriod }).lean(),
      // Storage per project: live uploaded files
      File.aggregate<{ _id: unknown; bytes: number; files: number }>([
        { $match: liveFiles },
        { $group: { _id: '$projectId', bytes: { $sum: '$size' }, files: { $sum: 1 } } },
      ]),
      // Uploads per project this month
      File.aggregate<{ _id: unknown; uploads: number }>([
        { $match: { ...liveFiles, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: '$projectId', uploads: { $sum: 1 } } },
      ]),
      // Uploads the API refused this month (not yet dismissed), per project
      UploadRejection.aggregate<{ _id: unknown; failed: number }>([
        {
          $match: {
            projectId: { $in: projectIds },
            dismissedAt: null,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: '$projectId', failed: { $sum: 1 } } },
      ]),
      File.find({
        projectId: { $in: projectIds },
        status: { $in: ['UPLOADED', 'UPLOADING', 'FAILED'] },
        deletedAt: null,
      })
        .sort({ _id: -1 })
        .limit(5)
        .lean(),
    ]);

  const tier: Tier = subscription?.tier ?? 'FREE';
  const limits = TIER_LIMITS[tier];

  const storageMap = new Map(storageByProject.map((r) => [String(r._id), r]));
  const uploadsMap = new Map(uploadsByProject.map((r) => [String(r._id), r.uploads]));
  const failed = failedByProject
    .map((r) => ({ project: projectById.get(String(r._id)), count: r.failed }))
    .filter((r) => r.project && r.count > 0);
  const failedTotal = failed.reduce((n, r) => n + r.count, 0);
  const failedProject = failed.length === 1 ? failed[0]?.project : undefined;
  // With several affected projects the link goes to the one with the most rejections
  const failedTop = [...failed].sort((x, y) => y.count - x.count)[0]?.project;
  const failedHref = failedTop
    ? `/dashboard/projects/${failedTop.slug}/rejected`
    : '/dashboard/projects';

  const hasProjects = projects.length > 0;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.02em]">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All projects &middot; {TIER_LABEL[tier]} plan
          </p>
        </div>
        <NewProjectButton />
      </header>

      {!hasProjects ? (
        <section className="mt-8" aria-labelledby="empty-h">
          <div className="pd-empty">
            <h2 id="empty-h" className="text-[1.0625rem] font-medium">No projects yet</h2>
            <p className="text-sm text-muted-foreground">
              A project holds your files, API keys and routers. Create one with New project above and
              its usage and uploads will appear here.
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid min-w-0 grid-cols-1 gap-8">
            {failedTotal > 0 ? (
              <section
                aria-label="Rejected uploads"
                className="pd-state-error flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
                style={{ display: 'flex', padding: '16px 20px' }}
              >
                <div>
                  <h2 className="text-[1.0625rem] font-medium">
                    {formatNumber(failedTotal)} {failedTotal === 1 ? 'upload was' : 'uploads were'} rejected
                    {failedProject ? ` in ${failedProject.name}` : ' this month'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {failed.length === 1
                      ? 'This month. See the file names and reasons.'
                      : failed.map((r) => `${r.project?.name} (${r.count})`).join(', ')}
                  </p>
                </div>
                <Link
                  href={failedHref}
                  className="pd-button pd-button--secondary"
                  style={{ minHeight: '2rem' }}
                >
                  View rejected
                </Link>
              </section>
            ) : null}

            <section aria-labelledby="usage-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="usage-h" className="text-[1.0625rem] font-medium">
                  Usage this month, all projects
                </h2>
                <span className="text-sm text-muted-foreground">
                  {TIER_LABEL[tier]} plan &middot; {periodLabel}
                </span>
              </div>
              <ul className="grid gap-1">
                <MeterRow
                  label="Storage"
                  scope="all projects"
                  used={usage?.storageUsed ?? 0}
                  limit={limits.maxStorageBytes}
                  kind="bytes"
                />
                <MeterRow
                  label="Bandwidth"
                  scope="all projects"
                  used={usage?.bandwidth ?? 0}
                  limit={limits.maxBandwidthBytes}
                  kind="bytes"
                />
                <MeterRow
                  label="Uploads"
                  scope="all projects"
                  used={usage?.uploads ?? 0}
                  limit={limits.maxUploadsPerMonth}
                  kind="count"
                />
              </ul>
            </section>

            <section aria-labelledby="recent-h">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 id="recent-h" className="text-[1.0625rem] font-medium">Recent uploads</h2>
                {projects[0] ? (
                  <Link
                    href={`/dashboard/projects/${projects[0].slug}/files`}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    All files &rarr;
                  </Link>
                ) : null}
              </div>
              {recentFiles.length === 0 ? (
                <div className="pd-empty">
                  <h3>No uploads yet</h3>
                  <p className="text-sm">
                    Files uploaded to any project show up here with the project they belong to.
                  </p>
                </div>
              ) : (
                <div
                  className="pd-table-wrap"
                  style={{ maxHeight: 'none' }}
                  role="region"
                  aria-labelledby="recent-h"
                  tabIndex={0}
                >
                  <table className="pd-table">
                    <caption className="sr-only">Recent uploads across all projects</caption>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Project</th>
                        <th scope="col">Size</th>
                        <th scope="col">Status</th>
                        <th scope="col">Uploaded</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentFiles.map((file) => {
                        const project = projectById.get(String(file.projectId));
                        const status = STATUS_WORD[file.status] ?? { word: file.status, dot: '' };
                        return (
                          <tr key={String(file._id)} style={{ height: '3rem' }}>
                            <td className="max-w-[190px] font-mono">
                              <span className="block truncate" title={file.name}>{file.name}</span>
                            </td>
                            <td className="font-mono text-muted-foreground">{project?.name ?? '—'}</td>
                            <td className="font-mono">{formatBytes(file.size)}</td>
                            <td>
                              <span className="inline-flex items-center gap-2">
                                <span className={`pd-dot ${status.dot}`} aria-hidden="true" />
                                {status.word}
                              </span>
                            </td>
                            <td className="text-muted-foreground">{formatRelative(file.createdAt, now)}</td>
                            <td>
                              {file.status === 'UPLOADED' ? (
                                <CopyUrlButton url={file.url} name={file.name} />
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-8">
            <section aria-labelledby="bp-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="bp-h" className="text-[1.0625rem] font-medium">Usage by project</h2>
                <span className="text-sm text-muted-foreground">bars: share of plan limit</span>
              </div>
              <ul className="grid gap-1">
                {projects.map((project) => {
                  const key = String(project._id);
                  return (
                    <li key={key} className="grid gap-2.5 rounded-md bg-card px-4 py-3.5">
                      <Link
                        href={`/dashboard/projects/${project.slug}/files`}
                        className="text-sm hover:underline"
                      >
                        {project.name} &rarr;
                      </Link>
                      <MiniLine
                        project={project.name}
                        label="Storage"
                        used={storageMap.get(key)?.bytes ?? 0}
                        limit={limits.maxStorageBytes}
                        kind="bytes"
                      />
                      <MiniLine
                        project={project.name}
                        label="Uploads"
                        used={uploadsMap.get(key) ?? 0}
                        limit={limits.maxUploadsPerMonth}
                        kind="count"
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                Bandwidth is measured for the whole account, not per project.
              </p>
            </section>

            <section aria-labelledby="plan-h">
              <div className="mb-3">
                <h2 id="plan-h" className="text-[1.0625rem] font-medium">Plan</h2>
              </div>
              <div className="grid gap-0.5 rounded-md bg-card px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{TIER_LABEL[tier]}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Number.isFinite(limits.maxProjects)
                      ? `${projects.length} of ${limits.maxProjects} projects`
                      : `${projects.length} projects`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(limits.maxFileSizeBytes, 0)} max file size.
                  {Number.isFinite(limits.maxStorageBytes)
                    ? ` ${formatBytes(limits.maxStorageBytes, 0)} storage, ${formatNumber(limits.maxUploadsPerMonth)} uploads a month.`
                    : ' No storage or upload cap.'}
                </p>
                <p className="mt-2">
                  <Link
                    href="/dashboard/billing"
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {tier === 'FREE' ? 'Compare plans' : 'Manage billing'} &rarr;
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
