import type { Tier, FileStatus } from './types';

export const TIERS: readonly Tier[] = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'] as const;
export const FILE_STATUSES: readonly FileStatus[] = ['UPLOADING', 'UPLOADED', 'FAILED', 'DELETED'] as const;

export const TIER_LIMITS = {
  FREE: {
    maxStorageBytes: 5 * 1024 * 1024 * 1024,       // 5 GB
    maxBandwidthBytes: 2 * 1024 * 1024 * 1024,      // 2 GB
    maxFileSizeBytes: 4 * 1024 * 1024,               // 4 MB
    maxUploadsPerMonth: 1000,
    maxProjects: 2,
    maxApiKeys: 2,
  },
  PRO: {
    maxStorageBytes: 100 * 1024 * 1024 * 1024,      // 100 GB
    maxBandwidthBytes: 200 * 1024 * 1024 * 1024,    // 200 GB
    maxFileSizeBytes: 512 * 1024 * 1024,             // 512 MB
    maxUploadsPerMonth: 50000,
    maxProjects: 10,
    maxApiKeys: 10,
  },
  TEAM: {
    maxStorageBytes: 1024 * 1024 * 1024 * 1024,     // 1 TB
    maxBandwidthBytes: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB
    maxFileSizeBytes: 5 * 1024 * 1024 * 1024,       // 5 GB
    maxUploadsPerMonth: 500000,
    maxProjects: 50,
    maxApiKeys: 50,
  },
  ENTERPRISE: {
    maxStorageBytes: Infinity,
    maxBandwidthBytes: Infinity,
    maxFileSizeBytes: 10 * 1024 * 1024 * 1024,      // 10 GB
    maxUploadsPerMonth: Infinity,
    maxProjects: Infinity,
    maxApiKeys: Infinity,
  },
} as const satisfies Record<
  Tier,
  {
    maxStorageBytes: number;
    maxBandwidthBytes: number;
    maxFileSizeBytes: number;
    maxUploadsPerMonth: number;
    maxProjects: number;
    maxApiKeys: number;
  }
>;

export const API_KEY_PREFIX = {
  live: 'uk_live_',
  test: 'uk_test_',
} as const;
