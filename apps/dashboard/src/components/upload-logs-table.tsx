'use client';

import * as React from 'react';
import { useLogs } from '../hooks/use-logs';
import { formatBytes } from '../lib/format';

// Badge variants for file status
const STATUS_BADGE: Record<
  'UPLOADING' | 'UPLOADED' | 'FAILED',
  { label: string; className: string }
> = {
  UPLOADED: {
    label: 'Uploaded',
    className:
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  },
  UPLOADING: {
    label: 'Uploading',
    className:
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  },
  FAILED: {
    label: 'Failed',
    className:
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  },
};

const TIME_RANGE_OPTIONS = [
  { label: 'Last hour', value: '1h' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
] as const;

type TimeRange = '1h' | '24h' | '7d';
type StatusFilter = '' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

function getSince(range: TimeRange): string {
  const now = Date.now();
  const ms: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - ms[range]).toISOString();
}

/** Returns a relative time string like "2m ago", "just now", "3h ago" */
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 10_000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface UploadLogsTableProps {
  slug: string;
}

export function UploadLogsTable({ slug }: UploadLogsTableProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('24h');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('');

  const { logs, isLoading } = useLogs({
    slug,
    since: getSince(timeRange),
    status: statusFilter || undefined,
  });

  // Force re-render for relative timestamps every 30s
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>

        <div className="h-4 w-px bg-white/[0.08]" />

        {/* Time range */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="rounded-md border border-white/[0.08] bg-[#141416] px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-white/[0.08] bg-[#141416] px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="UPLOADED">Uploaded</option>
          <option value="UPLOADING">Uploading</option>
          <option value="FAILED">Failed</option>
        </select>

        <span className="ml-auto text-xs text-zinc-500">
          {isLoading ? 'Refreshing...' : `${logs.length} entries`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06]">
        {logs.length === 0 && !isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            No upload activity in the selected time range.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">File name</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 hidden sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 hidden md:table-cell">
                  Uploaded by
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.map((log) => {
                const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.FAILED;
                return (
                  <tr
                    key={log._id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="max-w-[200px] truncate font-medium text-zinc-100"
                        title={log.name}
                      >
                        {log.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums">
                      {formatBytes(log.size)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                      {log.type}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                      {log.uploadedBy ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500 tabular-nums">
                      {relativeTime(log.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
