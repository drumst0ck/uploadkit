# Phase 7: Billing & Email - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Stripe subscription lifecycle (Checkout, Billing Portal, webhooks, metered overage via Meters API), soft tier enforcement with usage alert emails, and transactional emails via Resend + React Email (welcome, 80%/100% usage alerts, invoice/payment emails).

</domain>

<decisions>
## Implementation Decisions

### Stripe Flow
- **D-01:** Stripe Checkout (hosted page) for upgrade/subscription creation. Redirect to Stripe, they handle payment form, 3DS. No embedded Stripe Elements.
- **D-02:** Stripe webhook handler at `POST /api/v1/webhooks/stripe` in the API app. Consistent with existing webhook patterns (QStash DLQ is already there).

### Metered Billing
- **D-03:** Real-time per-event usage reporting to Stripe Meters API. Each upload/bandwidth event fires a MeterEvent immediately (not batched). Higher API call volume but most accurate billing.
- **D-04:** Soft limit with alerts — uploads continue past 100% of tier limit. Email alerts at 80% and 100%. Overage billed on next Stripe invoice. No hard blocking.

### Email Templates
- **D-05:** React Email templates (`@react-email/components`). Build as React components, render to HTML via Resend SDK at send time.
- **D-06:** Full marketing email design — rich layout with UploadKit branding, header with logo, styled body, social links, professional footer. Not minimal.

### Tier Enforcement
- **D-07:** Tier limits checked in `/api/v1/upload/request` before generating the presigned URL. Reject early with Stripe-style error message including upgrade CTA URL.
- **D-08:** Usage alert emails fire on the upload that crosses the 80% or 100% threshold. Check after each upload's `$inc`. Real-time alerts, no cron delay.

### Claude's Discretion
- Stripe Products/Prices setup approach (API vs Dashboard)
- Webhook event handler structure (switch statement vs handler map)
- Stripe Meters API configuration specifics (meter names, event names)
- React Email template component structure
- Billing Portal configuration (allowed features)
- Invoice webhook handling (invoice.paid, invoice.payment_failed)
- Subscription status sync timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §5.3 — Pricing tiers, overage pricing ($0.02/GB, $0.01/GB BW, $0.001/upload)
- `UPLOADKIT-GSD.md` §8 — Stripe products, webhook events to handle

### Stack Research
- `.planning/research/STACK.md` — Stripe Meters API (post-2025-03-31.basil), legacy UsageRecord removed
- `.planning/research/PITFALLS.md` — Stripe billing API changes

### Prior Phase Context
- `.planning/phases/03-upload-flow-rest-api/03-CONTEXT.md` — D-05 (confirm step updates usage), D-09 (async QStash webhooks), D-10 (DLQ failure tracking)
- `.planning/phases/06-dashboard/06-CONTEXT.md` — Billing page shell exists, data fetching via SWR

### Existing Code
- `apps/dashboard/src/app/dashboard/billing/page.tsx` — Billing shell (Phase 6)
- `apps/api/src/app/api/v1/upload/request/route.ts` — Where tier limits are checked
- `apps/api/src/app/api/v1/upload/complete/route.ts` — Where usage $inc happens
- `packages/db/src/models/subscription.ts` — Subscription model (TIERS, SUB_STATUSES)
- `packages/db/src/models/usage-record.ts` — UsageRecord model (storageUsed, bandwidth, uploads)
- `packages/shared/src/constants.ts` — TIER_LIMITS with storage/bandwidth/uploads per tier

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/db/src/models/subscription.ts` — Subscription model with stripeCustomerId, stripeSubscriptionId, tier, status
- `packages/shared/src/constants.ts` — `TIER_LIMITS` already defines limits per tier
- `apps/api/src/lib/with-api-key.ts` — Attaches project + user tier to context
- `apps/api/src/app/api/v1/upload/request/route.ts` — Already has basic tier checking (from Phase 3)
- `apps/dashboard/src/app/dashboard/billing/page.tsx` — Shell with plan card

### Established Patterns
- API routes use `withApiKey` wrapper
- Webhook routes at `/api/v1/webhooks/` (QStash DLQ already there)
- Usage tracking via MongoDB atomic `$inc`
- SWR for dashboard data fetching

### Integration Points
- Stripe webhook → update Subscription model → dashboard billing page reflects change
- Upload request → check Subscription tier → enforce limits → send alert email if threshold crossed
- Billing page → create Checkout session → redirect to Stripe → webhook processes payment
- Billing Portal link in billing page

</code_context>

<specifics>
## Specific Ideas

- Research confirmed Stripe Meters API uses `Meter` + `MeterEvent` — not the legacy `UsageRecord` API
- The existing billing page shell needs to be updated to show real Stripe data and enable the upgrade button
- Resend is already in the project (installed for Auth.js magic links in Phase 2) — just need `@react-email/components` for template building
- The 80%/100% alert check should be in the upload complete handler, right after the `$inc` — compare new total against `TIER_LIMITS[tier]`
- Consider creating an `emails/` package or directory for React Email templates to keep them organized

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-billing-email*
*Context gathered: 2026-04-08*
