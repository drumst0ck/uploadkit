'use client';

import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

export interface LogEntry {
  _id: string;
  name: string;
  size: number;
  type: string;
  status: 'UPLOADING' | 'UPLOADED' | 'FAILED';
  createdAt: string;
  uploadedBy?: string;
}

interface UseLogsOptions {
  slug: string;
  since?: string | undefined;   // ISO timestamp
  status?: string | undefined;  // UPLOADING | UPLOADED | FAILED | '' (all)
}

export function useLogs({ slug, since, status }: UseLogsOptions) {
  // Default since: 24 hours ago
  const defaultSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceValue = since ?? defaultSince;

  const params = new URLSearchParams({ since: sinceValue });
  if (status) params.set('status', status);

  const key = `/api/internal/projects/${slug}/logs?${params.toString()}`;

  const { data, isLoading, error } = useSWR<LogEntry[]>(key, fetcher, {
    // DASH-07, D-09: poll every 5 seconds for live upload activity
    refreshInterval: 5000,
    // Keep previous data while refetching (no flicker)
    keepPreviousData: true,
    // Revalidate on window focus for freshness
    revalidateOnFocus: true,
  });

  return {
    logs: data ?? [],
    isLoading,
    error,
  };
}
