'use client';

import Link from 'next/link';
import type { Tier, TierFeatureKey } from '@uploadkitdev/shared';
import { TIER_FEATURES, tierHasFeature } from '@uploadkitdev/shared';

interface TierGateProps {
  tier: Tier;
  feature: TierFeatureKey;
  featureLabel: string;
  children: React.ReactNode;
}

/** Minimum tier that unlocks a feature. */
function minimumTierFor(feature: TierFeatureKey): Tier {
  const order: Tier[] = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'];
  for (const tier of order) {
    if (tierHasFeature(tier, feature)) return tier;
  }
  return 'ENTERPRISE';
}

export function TierGate({ tier, feature, featureLabel, children }: TierGateProps) {
  if (tierHasFeature(tier, feature)) {
    return <>{children}</>;
  }

  const required = minimumTierFor(feature);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          {featureLabel} requires {required} plan
        </p>
        <p className="text-sm text-muted-foreground">
          Upgrade to unlock {featureLabel.toLowerCase()} and other {TIER_FEATURES[required].support.toLowerCase()}-tier features.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Upgrade to {required}
        </Link>
      </div>
    </div>
  );
}
