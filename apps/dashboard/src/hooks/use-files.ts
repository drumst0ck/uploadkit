'use client';

import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

export interface FileRecord {
  _id: string;
  name: string;
  key: string;
  size: number;
  type: string;
  url: string;
  status: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseFilesResult {
  files: FileRecord[];
  isLoading: boolean;
  error: unknown;
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  mutate: () => void;
}

interface UseFilesOptions {
  slug: string;
  search?: string;
  typeFilter?: string;
  cursor?: string;
}

export function useFiles({
  slug,
  search = '',
  typeFilter = '',
  cursor = '',
}: UseFilesOptions): UseFilesResult {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (typeFilter) params.set('type', typeFilter);
  if (cursor) params.set('cursor', cursor);

  const key = `/api/internal/projects/${slug}/files?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{
    files: FileRecord[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }>(key, fetcher);

  return {
    files: data?.files ?? [],
    isLoading,
    error,
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore ?? false,
    totalCount: data?.totalCount ?? 0,
    mutate,
  };
}
