---
phase: 07-billing-email
plan: 01
subsystem: billing
tags: [stripe, checkout, billing-portal, subscription, payments]
dependency_graph:
  requires: [packages/db, apps/api/src/lib/errors.ts, apps/dashboard/auth.ts]
  provides: [stripe-client-singletons, checkout-endpoint, portal-endpoint, live-billing-page]
  affects: [apps/api, apps/dashboard, packages/db]
tech_stack:
  added: [stripe@22.0.1]
  patterns: [lazy-proxy-singleton, exactOptionalPropertyTypes-conditional-spread, server-actions-direct-stripe]
key_files:
  created:
    - apps/api/src/lib/stripe.ts
    - apps/dashboard/src/lib/stripe.ts
    - apps/api/src/app/api/v1/billing/checkout/route.ts
    - apps/api/src/app/api/v1/billing/portal/route.ts
    - apps/dashboard/src/app/dashboard/billing/actions.ts
    - scripts/setup-stripe.ts
  modified:
    - packages/db/src/models/subscription.ts
    - apps/dashboard/src/app/dashboard/billing/page.tsx
    - .env.example
    - apps/api/package.json
    - apps/dashboard/package.json
    - pnpm-lock.yaml
decisions:
  - Lazy Proxy pattern for Stripe singleton: defers STRIPE_SECRET_KEY check to request time, not build time — prevents Next.js build failure in CI when key absent
  - Dashboard server actions call Stripe directly (not via API HTTP): cleaner architecture since both share the same DB; billing API routes serve external consumers
  - Stripe API version 2026-03-25.dahlia: installed stripe@22.0.1 uses this version (plan specified basil but package types dictate the valid version)
  - stripeCustomerId made sparse/unique (not required): free users have no Stripe customer; required:true prevented creating Subscription records for FREE tier
metrics:
  duration: 6m
  completed_date: "2026-04-08"
  tasks: 2
  files: 12
---

# Phase 7 Plan 01: Stripe Infrastructure Summary

Stripe payment foundation with Checkout Session endpoint, Billing Portal endpoint, lazy client singletons, idempotent setup script, and a fully live billing dashboard page replacing the Phase 6 disabled placeholder.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Stripe client singletons, subscription schema fix, setup script | 863e530 | stripe.ts (x2), subscription.ts, setup-stripe.ts, .env.example |
| 2 | Checkout/Portal API routes, billing server actions, live billing page | 6a72a28 | checkout/route.ts, portal/route.ts, actions.ts, billing/page.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version type mismatch**
- **Found during:** Task 1 build verification
- **Issue:** Plan specified `apiVersion: '2025-03-31.basil'` but installed `stripe@22.0.1` only accepts `'2026-03-25.dahlia'` in its TypeScript types
- **Fix:** Updated API version to `2026-03-25.dahlia` in both singletons and the setup script
- **Files modified:** `apps/api/src/lib/stripe.ts`, `apps/dashboard/src/lib/stripe.ts`, `scripts/setup-stripe.ts`
- **Commit:** 863e530

**2. [Rule 1 - Bug] Build-time Stripe singleton throw**
- **Found during:** Task 2 build verification
- **Issue:** `new Stripe()` at module scope throws immediately when `STRIPE_SECRET_KEY` is absent (build time), causing Next.js to fail collecting page data for the billing routes
- **Fix:** Refactored both singletons to a lazy Proxy pattern — Stripe is instantiated only on the first actual request, not at module load. Consistent with how storage.ts handles absent env vars.
- **Files modified:** `apps/api/src/lib/stripe.ts`, `apps/dashboard/src/lib/stripe.ts`
- **Commit:** 6a72a28

**3. [Rule 1 - Bug] exactOptionalPropertyTypes: email conditional spread**
- **Found during:** Task 2 build verification
- **Issue:** `email: user?.email ?? undefined` assigned `string | undefined` to a property typed as `string` under `exactOptionalPropertyTypes: true`
- **Fix:** Changed to conditional spread `...(user?.email ? { email: user.email } : {})` in both checkout route and billing actions
- **Files modified:** `apps/api/src/app/api/v1/billing/checkout/route.ts`, `apps/dashboard/src/app/dashboard/billing/actions.ts`
- **Commit:** 6a72a28

## Known Stubs

None. All billing buttons are wired to real server actions. Invoice history fetches live Stripe data (shows "No invoices yet" for users without a Stripe customer, which is correct behavior — not a stub).

## Threat Flags

No new threat surface beyond what the plan's threat model documented (T-07-01 through T-07-04 all mitigated):
- userId sourced from auth session in server actions (T-07-01)
- priceId validated against env var whitelist (T-07-02)
- stripeCustomerId fetched from DB by userId (T-07-03)
- Invoice data scoped to user's own stripeCustomerId (T-07-04)

## Self-Check: PASSED
