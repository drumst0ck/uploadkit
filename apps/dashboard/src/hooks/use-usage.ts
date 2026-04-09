'use client';

import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import type { Tier } from '@uploadkitdev/shared';

export interface UsageData {
  current: {
    storageUsed: number;
    bandwidth: number;
    uploads: number;
  };
  history: Array<{
    period: string;
    storageUsed: number;
    bandwidth: number;
    uploads: number;
  }>;
  tier: Tier;
  currentPeriod: string;
}

export function useUsage() {
  const { data, isLoading, error } = useSWR<UsageData>(
    '/api/internal/usage',
    fetcher,
  );

  return {
    usage: data,
    isLoading,
    error,
  };
}
