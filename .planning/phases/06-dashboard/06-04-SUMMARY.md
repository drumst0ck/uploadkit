---
phase: 06-dashboard
plan: "04"
subsystem: dashboard
tags: [upload-logs, usage, billing, settings, polling, recharts, swr]
dependency_graph:
  requires: [06-01]
  provides: [upload-logs-page, usage-page, billing-page, settings-page]
  affects: [dashboard-nav]
tech_stack:
  added: []
  patterns:
    - SWR refreshInterval:5000 for live upload log polling
    - UsageProgressBar with TIER_LIMITS threshold color transitions
    - Recharts BarChart in ResponsiveContainer for 6-month usage history
    - AlertDialog with typed email confirmation for destructive account deletion
    - Server component data fetch + client component for interactive forms (settings)
key_files:
  created:
    - apps/dashboard/src/app/api/internal/projects/[slug]/logs/route.ts
    - apps/dashboard/src/app/api/internal/usage/route.ts
    - apps/dashboard/src/app/api/internal/settings/route.ts
    - apps/dashboard/src/app/dashboard/projects/[slug]/logs/page.tsx
    - apps/dashboard/src/app/dashboard/usage/page.tsx
    - apps/dashboard/src/app/dashboard/billing/page.tsx
    - apps/dashboard/src/app/dashboard/settings/page.tsx
    - apps/dashboard/src/components/upload-logs-table.tsx
    - apps/dashboard/src/components/usage-progress-bar.tsx
    - apps/dashboard/src/components/charts/usage-bar-chart.tsx
    - apps/dashboard/src/components/settings-form.tsx
    - apps/dashboard/src/hooks/use-logs.ts
    - apps/dashboard/src/hooks/use-usage.ts
  modified: []
decisions:
  - SWR keepPreviousData:true on useLogs to prevent table flicker during 5s refresh cycles
  - Dual YAxis in UsageBarChart — bytes axis (left) + count axis (right) avoids scale distortion between storage/bandwidth and upload counts
  - Server component for settings/billing pages passes initial data to thin client SettingsForm component — keeps auth/DB server-side while enabling interactive form UX
  - Account DELETE cascades to File, ApiKey, Project then User — ordered to avoid orphaned documents
  - File model has no routeSlug field — route filter UI shown but routes displayed as uploadedBy field; noted as deviation
metrics:
  duration: 30m
  completed: 2026-04-08
  tasks: 2
  files: 13
---

# Phase 06 Plan 04: Upload Logs, Usage, Billing, and Settings Summary

**One-liner:** Live upload log viewer with 5s SWR polling, tier-aware usage progress bars with Recharts bar chart history, billing shell with disabled Stripe placeholders, and settings with typed-confirmation account deletion.

## What Was Built

### Task 1: Upload logs page + usage page

**Upload Logs (`/dashboard/projects/[slug]/logs`)**
- `GET /api/internal/projects/[slug]/logs` — filters by `since` (ISO timestamp) and `status` (UPLOADING/UPLOADED/FAILED), scoped to project owner, returns last 100 entries sorted newest-first.
- `useLogs` hook: SWR with `refreshInterval: 5000` and `keepPreviousData: true` — no table flicker on refresh.
- `UploadLogsTable` client component: pulsing green "Live" indicator, time range select (1h/24h/7d), status filter, table with Status badge (green/yellow/red), File Name, Size, Type, Uploaded By, and relative time ("2m ago").

**Usage (`/dashboard/usage`)**
- `GET /api/internal/usage` — returns current period usage, 6-month history, and user tier derived from Subscription model.
- `useUsage` SWR hook.
- `UsageProgressBar` component: `limit === Infinity → 0%` for Enterprise tier; color transitions at `>80%` amber and `>95%` red.
- `UsageBarChart` Recharts `BarChart` in `ResponsiveContainer(height=300)` with dual Y-axes (bytes left, count right), dark tooltip, legend.
- Usage page: 3 progress bars (Storage, Bandwidth, Uploads this month) against `TIER_LIMITS[tier]`.

### Task 2: Billing + Settings

**Billing (`/dashboard/billing`)**
- Server component; fetches Subscription to determine tier.
- Current plan card with tier badge, tier description (limits), disabled "Upgrade to Pro" and "Manage Billing" buttons with tooltip noting Phase 7.
- Empty invoice history table placeholder.

**Settings (`/dashboard/settings` + `SettingsForm` client component)**
- Server page fetches User, passes name/email to `SettingsForm`.
- Profile section: name `<input>` (pre-filled), read-only email display, "Save changes" button calling `PUT /api/internal/settings`.
- Notifications section: checkboxes for usage alerts and product updates.
- Danger zone: "Delete Account" triggers `AlertDialog` — user must type their exact email address before the confirm button enables. On confirm: `DELETE /api/internal/settings` → redirect to `/login`.
- `GET/PUT/DELETE /api/internal/settings`: PUT validates name 1-100 chars, userId always from session (T-06-14). DELETE logs deletion event before cascading delete of all files, API keys, projects, then user (T-06-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Auth import path incorrectly generated as relative `'../../../auth'`**
- **Found during:** Task 1 build verification
- **Issue:** New pages at `src/app/dashboard/usage/` and `src/app/dashboard/billing/` depth needed `../../../../auth`, and `src/app/api/internal/usage/` needed `../../../../../auth`. All new files initially used a wrong relative depth.
- **Fix:** Corrected relative paths in all 5 affected files after first build failure.
- **Files modified:** billing/page.tsx, settings/page.tsx, usage/page.tsx, usage/route.ts, settings/route.ts, logs/page.tsx

**2. [Rule 1 - Bug] `exactOptionalPropertyTypes` incompatibility in `useLogs` props**
- **Found during:** Task 1 TypeScript check
- **Issue:** `status?: string` in `UseLogsOptions` failed when caller passed `string | undefined` under `exactOptionalPropertyTypes: true`.
- **Fix:** Changed to `status?: string | undefined` to satisfy strict optional typing.
- **Files modified:** `apps/dashboard/src/hooks/use-logs.ts`

**3. [Rule 2 - Missing] File model has no `routeSlug` field — route filter adapted**
- **Found during:** Task 1 planning review
- **Issue:** `IFile` has no `routeSlug` field; the plan called for filtering logs by route slug. There is no FK from File to FileRouter in the schema.
- **Fix:** Route filter omitted from DB query; `uploadedBy` field shown in table as "Uploaded by" column instead. Route column removed from table to avoid showing empty data. Logged for future plan to add `fileRouterId` FK to File model if needed.
- **Impact:** Route-level filtering deferred; functional polling, status, and date filtering are all operational.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Notification preferences (emailUsageAlerts, emailProductUpdates) | settings-form.tsx | Checkboxes stored in local React state only — no backend persistence. User model has no preference fields. Will be wired when Resend email preferences are added in a later phase. |
| Billing Upgrade/Manage Billing buttons | billing/page.tsx | Disabled with tooltip; Stripe Checkout and Billing Portal come in Phase 7. |

## Threat Surface Scan

All security mitigations from the threat model were applied:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-06-14 (Settings PUT elevation) | `userId` from session only; only `name` field updatable; email cannot be changed |
| T-06-15 (Account deletion repudiation) | `console.info` audit log before deletion; client-side typed email confirmation required |
| T-06-16 (Usage data disclosure) | All queries filter by `userId` from session |

No new threat surface introduced beyond the plan's threat model.

## Self-Check

Files exist:
- apps/dashboard/src/app/api/internal/projects/[slug]/logs/route.ts — CREATED
- apps/dashboard/src/app/api/internal/usage/route.ts — CREATED
- apps/dashboard/src/app/api/internal/settings/route.ts — CREATED
- apps/dashboard/src/hooks/use-logs.ts — CREATED (refreshInterval: 5000)
- apps/dashboard/src/components/upload-logs-table.tsx — CREATED (pulsing Live indicator)
- apps/dashboard/src/components/usage-progress-bar.tsx — CREATED (TIER_LIMITS thresholds)
- apps/dashboard/src/components/charts/usage-bar-chart.tsx — CREATED (BarChart in ResponsiveContainer)
- apps/dashboard/src/app/dashboard/usage/page.tsx — CREATED (3 progress bars)
- apps/dashboard/src/app/dashboard/billing/page.tsx — CREATED (Upgrade button)
- apps/dashboard/src/app/dashboard/settings/page.tsx — CREATED
- apps/dashboard/src/components/settings-form.tsx — CREATED (AlertDialog + typed confirmation)

Build: `pnpm turbo build --filter=@uploadkit/dashboard` — PASSED (3 successful, 3 total)

Commits:
- acc2f54: Task 1 (logs + usage)
- 9d14a8d: Task 2 (billing + settings)
