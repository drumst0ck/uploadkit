# Phase 7: Billing & Email - Discussion Log

> **Audit trail only.**

**Date:** 2026-04-08
**Phase:** 07-billing-email
**Areas discussed:** Stripe flow, Metered billing, Email templates, Tier enforcement

## Stripe Flow
- Upgrade: Stripe Checkout (hosted) — ✓
- Webhook handler: apps/api /api/v1/webhooks/stripe — ✓

## Metered Billing
- Usage reporting: Real-time per event (MeterEvent on each upload) — ✓
- Overage UX: Soft limit + alert (no hard block, overage on next invoice) — ✓

## Email Templates
- Approach: React Email (@react-email/components) — ✓
- Design: Full marketing (rich layout, branding, social links) — ✓

## Tier Enforcement
- Check point: Before presign in /api/v1/upload/request — ✓
- Alert trigger: On the upload that crosses 80%/100% threshold — ✓

## Claude's Discretion
Stripe setup, webhook structure, Meters config, template structure, Portal config, invoice handling

## Deferred Ideas
None
