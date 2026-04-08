---
phase: 07-billing-email
plan: "04"
subsystem: email-triggers
tags: [email, resend, auth, upload, stripe, webhooks]
dependency_graph:
  requires: ["07-02", "07-03"]
  provides: ["EMAIL-01", "EMAIL-02", "EMAIL-03"]
  affects: ["apps/dashboard/auth.ts", "apps/api/src/app/api/v1/upload/complete/route.ts", "apps/api/src/app/api/v1/webhooks/stripe/route.ts"]
tech_stack:
  added: ["@uploadkit/emails (workspace dep in dashboard + api)"]
  patterns: ["fire-and-forget void email sends", "threshold crossing detection (prevPercent < N && newPercent >= N)", "conditional spread for exactOptionalPropertyTypes", "typeof email === string narrowing for Stripe Customer type"]
key_files:
  created: []
  modified:
    - apps/dashboard/auth.ts
    - apps/dashboard/package.json
    - apps/api/package.json
    - apps/api/src/app/api/v1/upload/complete/route.ts
    - apps/api/src/app/api/v1/webhooks/stripe/route.ts
decisions:
  - "Threshold crossing uses prevPercent < threshold && newPercent >= threshold — one-shot firing regardless of subsequent uploads above threshold (Pitfall 5)"
  - "Customer email for invoice emails retrieved from Stripe API (authenticated), never from webhook payload — satisfies T-07-16 info disclosure mitigation"
  - "typeof email === 'string' narrowing required for Stripe Customer.email which is typed string | null in strict mode"
  - "Conditional spread ...(invoiceUrl ? { invoiceUrl } : {}) used for optional props under exactOptionalPropertyTypes: true"
  - "User DB lookup inside threshold block is deferred — only executes when a crossing is detected, minimising DB reads per upload"
metrics:
  duration: "~5m"
  completed: "2026-04-08T21:49:31Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 07 Plan 04: Email Trigger Wiring Summary

**One-liner:** Wired sendWelcomeEmail, sendUsageAlertEmail, and sendInvoiceEmail into auth createUser, upload/complete, and Stripe webhook handlers — all fire-and-forget with one-shot threshold detection.

## What Was Built

Connected the `@uploadkit/emails` package (Plan 03) to all three trigger points:

1. **Welcome email** — fires in `createUser` event in `apps/dashboard/auth.ts` after default project creation. Uses `void` so email failures never block signup.

2. **Usage alert emails** — fires in `apps/api/src/app/api/v1/upload/complete/route.ts`. The `UsageRecord.findOneAndUpdate` return value (previously discarded) is now captured as `newRecord`. Pre-increment values are derived (`prevStorageUsed = newRecord.storageUsed - file.size`, `prevUploads = newRecord.uploads - 1`). The `prevPercent < threshold && newPercent >= threshold` pattern ensures exactly one email per threshold crossing per billing period. Covers both storage and uploads dimensions.

3. **Invoice emails** — fires in `apps/api/src/app/api/v1/webhooks/stripe/route.ts`. `invoice.paid` sends type `'paid'` with `amount_paid`; `invoice.payment_failed` sends type `'failed'` with `amount_due`. Customer email is retrieved from Stripe API (not webhook payload) to satisfy T-07-16.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Welcome email trigger in auth + add @uploadkit/emails dep | f06f52f | auth.ts, dashboard/package.json, api/package.json |
| 2 | Usage alert triggers in upload/complete + invoice emails in webhook | 6b2c802 | upload/complete/route.ts, webhooks/stripe/route.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe Customer.email type narrowing**
- **Found during:** Task 2
- **Issue:** `paidCustomer.email` is typed as `string | null` in Stripe's TypeScript types. A truthy check (`if (customer.email)`) does not narrow to `string` under strict TypeScript — build failed with "Type 'undefined' is not assignable to type 'string'".
- **Fix:** Extracted email to a `const` and used `typeof paidEmail === 'string'` to narrow to `string` before passing to `sendInvoiceEmail`.
- **Files modified:** `apps/api/src/app/api/v1/webhooks/stripe/route.ts`
- **Commit:** 6b2c802

**2. [Rule 1 - Bug] exactOptionalPropertyTypes: invoiceUrl conditional spread**
- **Found during:** Task 2
- **Issue:** `InvoiceEmailProps.invoiceUrl?: string` combined with `exactOptionalPropertyTypes: true` rejected `invoiceUrl: invoice.hosted_invoice_url ?? undefined` (passing `string | undefined` to `string` optional property).
- **Fix:** Replaced with conditional spread `...(invoice.hosted_invoice_url ? { invoiceUrl: invoice.hosted_invoice_url } : {})` — established pattern in this codebase (see decisions in STATE.md).
- **Files modified:** `apps/api/src/app/api/v1/webhooks/stripe/route.ts`
- **Commit:** 6b2c802

## Known Stubs

None — all email functions are fully wired to real data sources. No hardcoded placeholders.

## Threat Flags

None — all new surface was in the plan's threat model (T-07-14, T-07-15, T-07-16).

## Self-Check: PASSED

Files exist:
- FOUND: apps/dashboard/auth.ts
- FOUND: apps/api/src/app/api/v1/upload/complete/route.ts
- FOUND: apps/api/src/app/api/v1/webhooks/stripe/route.ts

Commits exist:
- f06f52f — feat(07-04): welcome email trigger in auth + add @uploadkit/emails dep
- 6b2c802 — feat(07-04): usage alert and invoice email triggers in API handlers

Builds: @uploadkit/dashboard and @uploadkit/api both pass with no type errors.
