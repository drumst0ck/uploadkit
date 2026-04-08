---
phase: 07-billing-email
plan: 03
subsystem: emails
tags: [email, react-email, resend, transactional]
dependency_graph:
  requires: ["07-01"]
  provides: ["@uploadkit/emails"]
  affects: ["apps/api", "apps/dashboard"]
tech_stack:
  added: ["@react-email/components", "@react-email/render", "resend"]
  patterns: ["react-email templates", "fire-and-forget send helper", "null-guard singleton"]
key_files:
  created:
    - packages/emails/package.json
    - packages/emails/tsconfig.json
    - packages/emails/tsup.config.ts
    - packages/emails/src/index.ts
    - packages/emails/src/lib/send.ts
    - packages/emails/src/templates/welcome.tsx
    - packages/emails/src/templates/usage-alert.tsx
    - packages/emails/src/templates/invoice.tsx
  modified:
    - pnpm-lock.yaml
decisions:
  - "Used @react-email/render (not react-email package) — react-email v5 is a CLI tool only; render function lives in @react-email/render which ships as a dep of @react-email/components"
  - "Resend singleton null-guarded on RESEND_API_KEY: package works in dev/test without an API key configured"
  - "All template styles are inline CSSProperties — email clients do not support external or embedded stylesheets"
metrics:
  duration: "3m"
  completed_date: "2026-04-08"
  tasks_completed: 1
  files_created: 8
requirements_satisfied: [EMAIL-01, EMAIL-02, EMAIL-03]
---

# Phase 07 Plan 03: Email Templates and Resend Send Helper Summary

**One-liner:** React Email dark-theme templates (welcome, usage alert, invoice) with Resend singleton wrapper exported as `@uploadkit/emails`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | packages/emails workspace package with React Email templates | f7b4d35 | 8 created, pnpm-lock.yaml modified |

## What Was Built

### Package Structure

`packages/emails` is a new private workspace package (`@uploadkit/emails`) that provides:

- **Three React Email templates** — rich dark-theme HTML emails for the three transactional flows
- **Resend send helper** — singleton with null-guard and fire-and-forget error handling
- **Public API** — `sendWelcomeEmail`, `sendUsageAlertEmail`, `sendInvoiceEmail` that render + send in one call
- **Raw component exports** — `WelcomeEmail`, `UsageAlertEmail`, `InvoiceEmail` for preview/testing

### Templates

**WelcomeEmail** (`templates/welcome.tsx`)
- Props: `{ userName: string; loginUrl?: string }`
- Dark background (`#0a0a0b`), ⬡ UploadKit text logo, badge + hero heading
- Feature highlights table: storage, direct uploads, SDK components, API keys
- Quick-start code block with npm install snippet
- CTA: "Go to Dashboard" linking to `loginUrl` or default app URL
- Footer with GitHub/Discord links

**UsageAlertEmail** (`templates/usage-alert.tsx`)
- Props: `{ userName, usagePercent: 80 | 100, dimension, currentUsage, limit, tier, upgradeUrl? }`
- Amber accent for 80% threshold, red accent for 100% threshold
- Colored alert banner, usage summary table, progress bar visualization
- CTA: "Upgrade Plan" linking to `upgradeUrl` or billing page

**InvoiceEmail** (`templates/invoice.tsx`)
- Props: `{ userName, type: 'paid' | 'failed', amount, invoiceUrl?, date }`
- Green accent for paid state, red accent for failed state
- Invoice summary card with amount, date, and status
- Failed state includes 3-step help section (update card, Stripe retry, grace period)
- CTA: "View Invoice" (paid) or "Update Payment Method" (failed)

### Send Helper (`lib/send.ts`)

- Resend singleton: only initialized when `RESEND_API_KEY` is present; `null` otherwise
- `sendEmail({ to, subject, html })`: logs a warning when no API key, wraps in try/catch — never throws (T-07-11 mitigated)
- From address hardcoded to `noreply@uploadkit.dev` (T-07-12)
- No user-supplied HTML in templates — all props are typed strings rendered as React text nodes (T-07-13)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used @react-email/render instead of react-email**
- **Found during:** Task 1, DTS build step
- **Issue:** The plan specified `import { render } from 'react-email'` and `"react-email": "latest"` as a dependency. In v5, `react-email` is a CLI tool (no exports); the `render` function ships in `@react-email/render` (which is already a transitive dep of `@react-email/components`).
- **Fix:** Replaced `react-email` dependency with `@react-email/render` in `package.json`; updated import in `index.ts` to `from '@react-email/render'`
- **Files modified:** `packages/emails/package.json`, `packages/emails/src/index.ts`
- **Commit:** f7b4d35 (fixed inline before committing)

## Known Stubs

None — all templates render with typed props; no hardcoded placeholder data that flows to UI.

## Threat Flags

None — no new network endpoints or auth paths introduced. Email send is outbound-only via Resend SDK.

## Self-Check: PASSED

- [x] `packages/emails/src/templates/welcome.tsx` — exists, exports `WelcomeEmail`
- [x] `packages/emails/src/templates/usage-alert.tsx` — exists, exports `UsageAlertEmail`
- [x] `packages/emails/src/templates/invoice.tsx` — exists, exports `InvoiceEmail`
- [x] `packages/emails/src/lib/send.ts` — exists, exports `sendEmail`
- [x] `packages/emails/src/index.ts` — exports `sendWelcomeEmail`, `sendUsageAlertEmail`, `sendInvoiceEmail`
- [x] `packages/emails/dist/index.mjs` — exists (ESM output)
- [x] `packages/emails/dist/index.d.ts` — exists (type declarations)
- [x] Commit f7b4d35 — verified via `git log`
