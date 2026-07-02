import { connectDB, File, Project } from '@uploadkitdev/db';
import type { Tier } from '@uploadkitdev/shared';
import { tierHasFeature } from '@uploadkitdev/shared';
import { TierGate } from './tier-gate';

interface AdvancedAnalyticsProps {
  userId: string;
  tier: Tier;
}

export async function AdvancedAnalytics({ userId, tier }: AdvancedAnalyticsProps) {
  await connectDB();

  const projects = await Project.find({ userId }).select('_id').lean();
  const projectIds = projects.map((p) => p._id);

  const [totals, byStatus, topTypes] = await Promise.all([
    File.aggregate<{ total: number; failed: number }>([
      { $match: { projectId: { $in: projectIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
        },
      },
    ]),
    File.aggregate<{ _id: string; count: number }>([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    File.aggregate<{ _id: string; count: number }>([
      { $match: { projectId: { $in: projectIds }, status: 'UPLOADED' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const total = totals[0]?.total ?? 0;
  const failed = totals[0]?.failed ?? 0;
  const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

  const content = (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-6 text-sm font-medium text-foreground">Advanced analytics</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        <Stat label="Success rate" value={`${successRate}%`} />
        <Stat label="Total files" value={String(total)} />
        <Stat label="Failed uploads" value={String(failed)} />
      </div>

      {byStatus.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            By status
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {byStatus.map((row) => (
              <li
                key={row._id}
                className="flex justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{row._id}</span>
                <span className="font-medium text-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topTypes.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top MIME types
          </h3>
          <ul className="grid gap-2">
            {topTypes.map((row) => (
              <li
                key={row._id}
                className="flex justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <span className="truncate font-mono text-muted-foreground">{row._id || 'unknown'}</span>
                <span className="font-medium text-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (!tierHasFeature(tier, 'advancedAnalytics')) {
    return (
      <TierGate tier={tier} feature="advancedAnalytics" featureLabel="Advanced analytics">
        <span />
      </TierGate>
    );
  }

  return content;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
