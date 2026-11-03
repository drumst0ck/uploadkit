import type { Tier } from './types';

/** Free trial length for Pro (monthly and yearly). Team has no trial. */
export const PRO_TRIAL_DAYS = 14;

/** Subset of process.env read for price ids (STRIPE_PRO_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID, STRIPE_TEAM_PRICE_ID). */
export type CheckoutPriceEnv = Record<string, string | undefined>;

export interface CheckoutPlan {
  tier: 'PRO' | 'TEAM';
  interval: 'month' | 'year';
}

/** Resolve a Stripe price id to a purchasable plan. Unknown ids return null. */
export function resolveCheckoutPlan(priceId: string, env: CheckoutPriceEnv): CheckoutPlan | null {
  if (!priceId) return null;
  if (priceId === env['STRIPE_PRO_PRICE_ID']) return { tier: 'PRO', interval: 'month' };
  if (priceId === env['STRIPE_PRO_YEARLY_PRICE_ID']) return { tier: 'PRO', interval: 'year' };
  if (priceId === env['STRIPE_TEAM_PRICE_ID']) return { tier: 'TEAM', interval: 'month' };
  return null;
}

export interface TrialHistory {
  trialUsedAt?: Date | null | undefined;
  stripeSubscriptionId?: string | null | undefined;
  tier?: Tier | undefined;
  status?: string | undefined;
}

/**
 * One trial per account: any recorded trial, any current or former paid
 * subscription (including a canceled one from before the flag existed), or any
 * subscription in the Stripe customer's history makes the account ineligible.
 */
export function isTrialEligible(
  record: TrialHistory | null | undefined,
  stripeHasSubscriptionHistory: boolean,
): boolean {
  if (stripeHasSubscriptionHistory) return false;
  if (!record) return true;
  if (record.trialUsedAt) return false;
  if (record.stripeSubscriptionId) return false;
  if (record.tier && record.tier !== 'FREE') return false;
  if (record.status === 'CANCELED') return false;
  return true;
}

/**
 * Stripe Checkout fields that depend on the plan: Pro always collects a card
 * and, when eligible, starts a 14-day trial that is canceled (not billed to a
 * missing card) if no payment method exists at the end. Team never trials.
 */
export function checkoutTrialParams(plan: CheckoutPlan, eligible: boolean) {
  if (plan.tier !== 'PRO') return { subscriptionData: {}, topLevel: {} };
  return {
    topLevel: { payment_method_collection: 'always' as const },
    subscriptionData: eligible
      ? {
          trial_period_days: PRO_TRIAL_DAYS,
          trial_settings: { end_behavior: { missing_payment_method: 'cancel' as const } },
        }
      : {},
  };
}
