import type { Tier } from './types';
import { TIER_LIMITS } from './constants';

/** Feature flags and marketing copy derived from TIER_LIMITS — single source of truth. */
export const TIER_FEATURES = {
  FREE: {
    webhooks: false,
    customCdnDomain: false,
    advancedAnalytics: false,
    teamMembers: 1,
    teamCollaboration: false,
    sla: null as string | null,
    soc2: false,
    support: 'Community',
    imageTransforms: false,
  },
  PRO: {
    webhooks: true,
    customCdnDomain: true,
    advancedAnalytics: true,
    teamMembers: 1,
    teamCollaboration: false,
    sla: null as string | null,
    soc2: false,
    support: 'Email',
    imageTransforms: true,
  },
  TEAM: {
    webhooks: true,
    customCdnDomain: true,
    advancedAnalytics: true,
    teamMembers: 5,
    teamCollaboration: true,
    sla: '99.9%',
    soc2: false,
    support: 'Priority',
    imageTransforms: true,
  },
  ENTERPRISE: {
    webhooks: true,
    customCdnDomain: true,
    advancedAnalytics: true,
    teamMembers: Infinity,
    teamCollaboration: true,
    sla: '99.99%',
    soc2: true,
    support: 'Dedicated',
    imageTransforms: true,
  },
} as const satisfies Record<
  Tier,
  {
    webhooks: boolean;
    customCdnDomain: boolean;
    advancedAnalytics: boolean;
    teamMembers: number;
    teamCollaboration: boolean;
    sla: string | null;
    soc2: boolean;
    support: string;
    imageTransforms: boolean;
  }
>;

export type TierFeatureKey = keyof (typeof TIER_FEATURES)['FREE'];

export function tierHasFeature(tier: Tier, feature: TierFeatureKey): boolean {
  const value = TIER_FEATURES[tier][feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return value !== null;
}

export function getTeamMemberLimit(tier: Tier): number {
  return TIER_FEATURES[tier].teamMembers;
}

/** Human-readable limit strings for pricing comparison matrix. */
export function formatTierLimitValue(
  tier: Tier,
  field: keyof (typeof TIER_LIMITS)['FREE'],
): string {
  const value = TIER_LIMITS[tier][field];
  if (value === Infinity) return 'Unlimited';
  if (value === 0) return 'x';
  if (field.includes('Bytes')) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = value;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    const display = v % 1 === 0 ? v : v.toFixed(1);
    return `${display} ${units[i]}`;
  }
  return value.toLocaleString('en-US');
}

export function formatImageTransformLimit(tier: Tier): string {
  const limit = TIER_LIMITS[tier].maxImageTransformsPerMonth;
  if (limit === 0) return 'x';
  if (limit === Infinity) return 'From 100,000';
  return limit.toLocaleString('en-US');
}

export function formatTeamMemberLimit(tier: Tier): string {
  const limit = TIER_FEATURES[tier].teamMembers;
  if (limit === Infinity) return 'Custom';
  return String(limit);
}
