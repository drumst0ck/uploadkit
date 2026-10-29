// Plan intent carried from the marketing site (`/login?mode=signup&plan=pro`) through
// sign-in to the billing page. Only whitelisted values are accepted and the redirect
// target is built here from constants, so a crafted `plan` value can never turn the
// post-login redirect into an open redirect.

export type PlanIntent = 'pro' | 'team';

const PLAN_INTENTS: readonly PlanIntent[] = ['pro', 'team'];

export function parsePlanIntent(value: unknown): PlanIntent | null {
  return typeof value === 'string' && (PLAN_INTENTS as readonly string[]).includes(value)
    ? (value as PlanIntent)
    : null;
}

export function postLoginRedirect(plan: PlanIntent | null): string {
  return plan ? `/dashboard/billing?plan=${plan}` : '/dashboard';
}
