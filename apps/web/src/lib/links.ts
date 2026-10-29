// Dashboard entry points used by marketing CTAs.
// Sign-up and sign-in are separate on purpose: "Start for free" must open account
// creation, "Sign in" the existing-account flow. Paid plans carry the plan so the
// dashboard can offer that checkout right after sign-up (apps/dashboard/src/lib/plan-intent.ts).

const APP_URL = 'https://app.uploadkit.dev'

export const SIGN_IN_URL = `${APP_URL}/login`
export const SIGN_UP_URL = `${APP_URL}/login?mode=signup`

export function planSignUpUrl(plan: 'free' | 'pro' | 'team'): string {
  return plan === 'free' ? SIGN_UP_URL : `${SIGN_UP_URL}&plan=${plan}`
}
