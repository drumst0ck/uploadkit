'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '../../lib/fetcher';
import { formatBytes, formatNumber, formatRelative } from '../../lib/format';
import { DEFAULT_REJECTED_RANGE, REJECTED_RANGES, type RejectedRange } from '../../lib/rejections';

interface Rejection {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  routerSlug: string;
  code: string;
  reason: string;
  planLimit: boolean;
  createdAt: string;
}

interface RejectedResponse {
  rejections: Rejection[];
  routers: string[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const SMALL_BTN: React.CSSProperties = { minHeight: '2rem', padding: '0 var(--pd-space-3)' };
const RANGE_KEYS = Object.keys(REJECTED_RANGES) as RejectedRange[];
// Plain-language names for the stored codes, read by screen readers next to the reason
const CODE_WORD: Record<string, string> = {
  FILE_TOO_LARGE: 'File too large',
  TYPE_NOT_ALLOWED: 'Type not allowed',
  QUOTA_EXCEEDED: 'Quota exceeded',
};

export function RejectedUploads({ slug, projectName }: { slug: string; projectName: string }) {
  const [range, setRange] = React.useState<RejectedRange>(DEFAULT_REJECTED_RANGE);
  const [router, setRouter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('');
  const regionRef = React.useRef<HTMLDivElement>(null);

  const params = new URLSearchParams({ range });
  if (router) params.set('router', router);
  if (page > 1) params.set('page', String(page));
  const key = `/api/internal/projects/${slug}/rejected?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<RejectedResponse>(key, fetcher, {
    refreshInterval: 10000,
    keepPreviousData: true,
  });

  // A router whose rows are all gone (dismissed or aged out) can no longer be filtered on
  React.useEffect(() => {
    if (data && router && !data.routers.includes(router)) {
      setRouter('');
      setPage(1);
    }
  }, [data, router]);

  // Dismissing the last row of a later page steps back one page
  React.useEffect(() => {
    if (data && data.rejections.length === 0 && page > 1) setPage((p) => p - 1);
  }, [data, page]);

  const rows = data?.rejections ?? [];
  const routers = data?.routers ?? [];
  const showCompare = rows.some((r) => r.planLimit);
  const filtered = router !== '' || range !== DEFAULT_REJECTED_RANGE;
  const now = new Date();

  const dismiss = async (row: Rejection) => {
    setActionError(null);
    setPending(row.id);
    try {
      const res = await fetch(`/api/internal/projects/${slug}/rejected/${row.id}`, { method: 'PATCH' });
      if (res.ok) {
        await mutate();
        setStatus(`${row.fileName} dismissed`);
        regionRef.current?.focus();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? `Dismiss failed (${res.status})`);
      }
    } catch {
      setActionError('Dismiss failed: network error');
    } finally {
      setPending(null);
    }
  };

  const rangeLabel = REJECTED_RANGES[range].label.toLowerCase();

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.02em]">Rejected uploads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectName} &middot; uploads that failed a plan limit or a router rule
          </p>
        </div>
        {showCompare ? (
          <Link href="/dashboard/billing" className="pd-button pd-button--primary" style={{ textDecoration: 'none' }}>
            Compare plans
          </Link>
        ) : null}
      </header>

      <div className="sr-only" role="status" aria-live="polite">{status}</div>

      <section className="mt-8" aria-label="Rejected uploads">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="pd-field">
            <label className="sr-only" htmlFor="rejected-range">Time range</label>
            <div className="pd-select-wrap">
              <select
                id="rejected-range"
                className="pd-select sm:w-[180px]"
                value={range}
                onChange={(e) => {
                  setRange(e.target.value as RejectedRange);
                  setPage(1);
                }}
              >
                {RANGE_KEYS.map((k) => (
                  <option key={k} value={k}>{REJECTED_RANGES[k].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pd-field">
            <label className="sr-only" htmlFor="rejected-router">Router</label>
            <div className="pd-select-wrap">
              <select
                id="rejected-router"
                className="pd-select sm:w-[180px]"
                value={router}
                onChange={(e) => {
                  setRouter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All routers</option>
                {routers.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {data
              ? `${formatNumber(data.total)} ${data.total === 1 ? 'rejection' : 'rejections'} in the ${rangeLabel}`
              : isLoading
                ? 'Loading rejections'
                : ''}
          </span>
        </div>

        {actionError ? (
          <div role="alert" className="pd-state-error mb-3" style={{ padding: '12px 16px' }}>
            <p className="pd-error" style={{ margin: 0 }}>{actionError}</p>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="pd-state-error">
            <h3>Rejected uploads could not be loaded</h3>
            <p>Check your connection and try again.</p>
            <button type="button" className="pd-button pd-button--secondary" style={SMALL_BTN} onClick={() => mutate()}>
              Retry
            </button>
          </div>
        ) : !isLoading && data && rows.length === 0 ? (
          <div className="pd-empty">
            <h3>No rejected uploads</h3>
            <p>
              Uploads refused for size, type or quota show here for 30 days.
              {filtered ? ` Nothing matches ${router ? `${router} in the ` : 'the '}${rangeLabel}.` : ''}
            </p>
            {filtered ? (
              <button
                type="button"
                className="pd-button pd-button--secondary"
                style={SMALL_BTN}
                onClick={() => {
                  setRange(DEFAULT_REJECTED_RANGE);
                  setRouter('');
                  setPage(1);
                }}
              >
                Reset filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              ref={regionRef}
              className="pd-table-wrap"
              style={{ maxHeight: 'none' }}
              role="region"
              aria-label={`Rejected uploads in ${projectName}`}
              tabIndex={-1}
            >
              <table className="pd-table">
                <caption className="sr-only">Rejected uploads in {projectName}</caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ padding: '0 12px 0 16px' }}>Name</th>
                    <th scope="col" style={{ padding: '0 12px' }}>Reason</th>
                    <th scope="col" style={{ padding: '0 12px' }}>Router</th>
                    <th scope="col" style={{ padding: '0 12px' }}>Size</th>
                    <th scope="col" className="hidden sm:table-cell" style={{ padding: '0 12px' }}>Attempted</th>
                    <th scope="col" style={{ padding: '0 16px 0 12px', textAlign: 'right' }}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && rows.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} aria-hidden="true" style={{ height: '2.75rem' }}>
                          <td colSpan={6} style={{ padding: '0 16px' }}>
                            <span className="pd-skeleton" />
                          </td>
                        </tr>
                      ))
                    : rows.map((row) => (
                        <tr key={row.id} style={{ height: '2.75rem' }}>
                          <td className="max-w-[160px] font-mono sm:max-w-[240px]" style={{ padding: '0 12px 0 16px' }}>
                            <span className="block truncate" title={row.fileName}>{row.fileName}</span>
                          </td>
                          <td style={{ padding: '0 12px' }}>
                            <span className="inline-flex items-center gap-2">
                              <span className="pd-dot pd-dot--danger" aria-hidden="true" />
                              {row.reason}
                              <span className="sr-only"> ({CODE_WORD[row.code] ?? row.code})</span>
                            </span>
                          </td>
                          <td className="font-mono text-muted-foreground" style={{ padding: '0 12px' }}>{row.routerSlug}</td>
                          <td className="font-mono" style={{ padding: '0 12px' }}>{formatBytes(row.fileSize)}</td>
                          <td className="hidden text-muted-foreground sm:table-cell" style={{ padding: '0 12px' }}>
                            <time dateTime={row.createdAt} title={new Date(row.createdAt).toLocaleString('en-US')}>
                              {formatRelative(row.createdAt, now)}
                            </time>
                          </td>
                          <td style={{ padding: '0 16px 0 12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="pd-button pd-button--ghost"
                              style={SMALL_BTN}
                              disabled={pending === row.id}
                              onClick={() => dismiss(row)}
                              aria-label={`Dismiss ${row.fileName}`}
                            >
                              Dismiss
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {data && (data.hasMore || page > 1) ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                  Showing {(data.page - 1) * data.pageSize + 1}&ndash;{(data.page - 1) * data.pageSize + rows.length} of{' '}
                  {formatNumber(data.total)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="pd-button pd-button--secondary"
                    style={SMALL_BTN}
                    disabled={page === 1 || isLoading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="pd-button pd-button--secondary"
                    style={SMALL_BTN}
                    disabled={!data.hasMore || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
