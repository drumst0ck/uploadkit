---
phase: 07-billing-email
plan: 02
subsystem: payments
tags: [stripe, webhooks, metered-billing, tier-limits, uploadkit]

requires:
  - phase: 07-01
    provides: stripe singleton (lazy proxy), Subscription model with sparse stripeCustomerId, billing checkout/portal routes

provides:
  - Stripe webhook handler at POST /api/v1/webhooks/stripe (5 event types, HMAC-verified)
  - stripe-meters.ts with METER_STORAGE/BANDWIDTH/UPLOADS constants and sendMeterEvent helper
  - Soft tier limit enforcement in upload/request (FREE hard-block, paid pass-through)
  - MeterEvent firing in upload/complete for paid ACTIVE subscribers

affects: [upload-flow, tier-enforcement, billing, dashboard-usage]

tech-stack:
  added: []
  patterns:
    - "Stripe dahlia API (2026-03-25): current_period_start/end are per SubscriptionItem, not on Subscription root"
    - "Fire-and-forget meter events with void + try/catch in helper — meter failures never block upload responses"
    - "Soft limit pattern: FREE tier hard-blocked, paid tiers pass through with overage billed via Stripe Meters"
    - "MeterEvent identifier = file._id prevents double-counting on webhook retries"

key-files:
  created:
    - apps/api/src/app/api/v1/webhooks/stripe/route.ts
    - apps/api/src/lib/stripe-meters.ts
  modified:
    - apps/api/src/app/api/v1/upload/request/route.ts
    - apps/api/src/app/api/v1/upload/complete/route.ts

key-decisions:
  - "Stripe dahlia API moves current_period_start/end from Subscription to SubscriptionItem — extract from items.data[0] with undefined fallback"
  - "Tier limit checks use ctx.tier === 'FREE' guard — paid tiers (PRO/TEAM/ENTERPRISE) all pass through on quota breach"
  - "MeterEvents guarded by tier !== 'FREE' AND subscription.status === 'ACTIVE' — avoids billing PAST_DUE customers for overage"

patterns-established:
  - "Stripe webhook handler: req.text() for raw body, constructEvent for HMAC, return 200 for all events (even unhandled) to prevent retry storms"
  - "sendMeterEvent: STRIPE_SECRET_KEY null-guard for dev mode, try/catch never rethrows, void at call sites"

requirements-completed: [BILL-03, BILL-04, BILL-05, BILL-06]

duration: 3min
completed: 2026-04-08
---

# Phase 07 Plan 02: Billing Loop — Webhooks, Meters, and Soft Limits Summary

**Stripe webhook handler syncing subscription state via 5 event types, per-upload MeterEvents for paid users, and FREE-only hard limits with paid-tier overage billing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-08T21:35:38Z
- **Completed:** 2026-04-08T21:38:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Webhook handler at `POST /api/v1/webhooks/stripe` with HMAC signature verification (T-07-05/06), handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- `stripe-meters.ts` with three meter event constants and a fire-and-forget `sendMeterEvent` helper with idempotency via `file._id` identifier
- `upload/request`: FREE tier hard-blocked on quota breach, paid tiers (PRO/TEAM/ENTERPRISE) pass through (D-04 soft limit)
- `upload/complete`: storage + upload MeterEvents fired for paid ACTIVE subscribers after `$inc`, using `void` for fire-and-forget semantics

## Task Commits

1. **Task 1: Stripe webhook handler** - `e8daede` (feat)
2. **Task 2: Stripe Meters + soft limits** - `2e39938` (feat)

## Files Created/Modified

- `apps/api/src/app/api/v1/webhooks/stripe/route.ts` - Stripe webhook POST handler with 5 event type handlers and HMAC verification
- `apps/api/src/lib/stripe-meters.ts` - Meter event constants and sendMeterEvent helper
- `apps/api/src/app/api/v1/upload/request/route.ts` - Soft limit enforcement (FREE hard-block, paid pass-through)
- `apps/api/src/app/api/v1/upload/complete/route.ts` - MeterEvent firing after $inc for paid ACTIVE users

## Decisions Made

- Stripe dahlia API (2026-03-25) moved `current_period_start`/`current_period_end` from the `Subscription` root to each `SubscriptionItem` — adapted to extract from `items.data[0]` with conditional spread to avoid TypeScript `exactOptionalPropertyTypes` violations
- MeterEvents conditioned on `status === 'ACTIVE'` — avoids incorrectly billing PAST_DUE subscribers during grace period overage
- Unknown Stripe price IDs default to `'PRO'` tier (not ENTERPRISE) — conservative billing as specified in T-07-09

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe dahlia API: current_period_start/end moved to SubscriptionItem**
- **Found during:** Task 1 (Stripe webhook handler)
- **Issue:** Plan specified `sub.current_period_start` and `sub.current_period_end` but Stripe v22 with the `2026-03-25.dahlia` API version removed these fields from the `Subscription` root; they now live on each `SubscriptionItem`
- **Fix:** Extract period dates from `sub.items.data[0]?.current_period_start` / `current_period_end` with conditional spread (`undefined` falls back gracefully)
- **Files modified:** `apps/api/src/app/api/v1/webhooks/stripe/route.ts`
- **Verification:** TypeScript build passes, `pnpm build --filter @uploadkit/api` succeeds
- **Committed in:** `e8daede` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary adaptation to Stripe API breaking change in dahlia version. No scope creep.

## Issues Encountered

The Stripe `2026-03-25.dahlia` API version (used in the project's `stripe.ts` singleton) introduced a breaking change where `current_period_start` and `current_period_end` fields moved from the top-level `Subscription` object to individual `SubscriptionItem` objects. The plan's action spec referenced the old field paths. Fixed inline per Rule 1.

## Known Stubs

None — all meter events and webhook handlers are fully wired.

## Threat Flags

No new threat surface introduced beyond what was already in the plan's threat model.

## Next Phase Readiness

- Billing loop is closed: checkout → subscription sync → per-upload metered billing → overage invoicing
- FREE tier enforcement hardened; paid users have soft limits with automatic overage billing
- Ready for Phase 07 Plans 03-04 (transactional emails, usage alerts)

---
*Phase: 07-billing-email*
*Completed: 2026-04-08*
