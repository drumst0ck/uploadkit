---
phase: quick-260410-gx3
plan: 01
subsystem: dashboard
tags: [dashboard, upload, r2, presign, multipart, session-auth]
requires:
  - packages/db (Project, File, Subscription, UsageRecord)
  - packages/shared (TIER_LIMITS, Tier)
  - apps/dashboard/auth.ts (Auth.js v5 session)
provides:
  - Session-authed upload flow for dashboard (no API key needed)
  - Five internal upload routes under /api/internal/projects/[slug]/upload/*
  - DashboardUploadDropzone component (single + multipart flows)
affects:
  - apps/dashboard FileBrowser (dropzone rendered above toolbar)
tech-stack:
  added:
    - "@aws-sdk/client-s3 (latest)"
    - "@aws-sdk/s3-request-presigner (latest)"
    - "zod (latest)"
  patterns:
    - "Session auth guard: auth() + Project.findOne({ slug, userId })"
    - "XHR-based PUT for upload progress (fetch lacks upload.onprogress)"
    - "Multipart concurrency cap of 3 parts per batch"
key-files:
  created:
    - apps/dashboard/src/lib/storage.ts
    - apps/dashboard/src/lib/presign.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/upload/request/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/upload/complete/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/init/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/complete/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/abort/route.ts
    - apps/dashboard/src/components/file-browser/dashboard-upload-dropzone.tsx
  modified:
    - apps/dashboard/package.json
    - apps/dashboard/src/components/file-browser/file-browser.tsx
decisions:
  - "Dashboard duplicates storage.ts/presign.ts rather than extracting a shared package — single quick task, matches existing mongoose duplication pattern"
  - "Added a new /upload/complete internal route (5th route, not in original frontmatter file list) to avoid cross-coupling with API-key-gated /api/v1/upload/complete"
  - "Tier resolved via Subscription.findOne({ userId }) — User model has no tier field (plan suggested User.findById but tier lives on Subscription)"
  - "File keys use synthetic routeSlug 'dashboard' — dashboard uploads bypass FileRouter"
  - "XHR instead of fetch for single upload — browsers do not expose upload progress on fetch"
  - "Multipart progress tracked as completedParts/totalParts (per-part granularity acceptable for UX)"
  - "Usage alert emails + Stripe MeterEvents NOT replicated in dashboard complete route — feature parity deferred; dashboard uploads still count in UsageRecord"
metrics:
  duration: "~10m"
  completed: "2026-04-10"
  tasks: 3
  files_touched: 10
---

# Quick Task 260410-gx3: Add file upload UI to dashboard project files page — Summary

Session-authed file upload flow for the dashboard. Users can drag-and-drop or click-to-browse on the project files page; files upload directly to R2 via presigned URLs and appear in the list via SWR mutate.

## What was built

1. **Dashboard R2 helpers** (`lib/storage.ts`, `lib/presign.ts`) — copied verbatim from `apps/api`, ContentType+ContentLength locked in signatures.

2. **Five internal upload routes** under `/api/internal/projects/[slug]/upload/*`:
   - `request` — single-upload presign (≤10 MiB)
   - `complete` — HEAD R2, flip to UPLOADED, increment UsageRecord
   - `multipart/init` — create multipart, presign all parts (1h expiry)
   - `multipart/complete` — CompleteMultipartUploadCommand, flip status, usage inc
   - `multipart/abort` — AbortMultipartUploadCommand + File.deleteOne

   All routes call `auth()` then `Project.findOne({ slug, userId: session.user.id })` before any R2 or DB mutation. No API key paths. Returns 401 (no session) / 404 (cross-user or missing slug).

3. **DashboardUploadDropzone** — ~370-line client component:
   - Drag-drop with dragCounter debounce to prevent flicker from child elements
   - Keyboard accessible (role=button, tabIndex=0, Enter/Space handler, aria-label)
   - XHR-based PUT for real upload progress on single flow
   - Multipart flow slices file into 5 MiB chunks, uploads 3 at a time via Promise.all batches
   - On any multipart error, calls `/multipart/abort` before surfacing
   - Per-file success/error state with clear-completed button

4. **FileBrowser** wires the dropzone above `DataTableToolbar` and passes `mutate` as `onUploadComplete` so uploaded files appear immediately without waiting for the 5s SWR poll.

## Commits

- `871de6c` — feat(quick-260410-gx3): add R2 storage/presign helpers to dashboard
- `0433cf5` — feat(quick-260410-gx3): add session-authed internal upload routes
- `539d13b` — feat(quick-260410-gx3): add DashboardUploadDropzone and wire into FileBrowser

## Verification

- `pnpm typecheck` in `apps/dashboard`: PASS after every task
- Manual smoke test deferred to user (requires running dev server + R2 credentials)

## Deviations from Plan

### Rule 3 — Blocking fixes

**1. Plan said `User.findById` for tier — User has no tier field**
- **Found during:** Task 2
- **Issue:** Plan directed executor to read tier via `User.findById(session.user.id)`, but `IUser` has no `tier` field. Tier lives on `Subscription`.
- **Fix:** Resolved tier via `Subscription.findOne({ userId: session.user.id })`, falling back to `'FREE'`. Matches how `apps/api withApiKey` resolves tier.
- **Files:** all three quota-enforcing upload routes.

**2. Import path depth for `auth`**
- **Found during:** Task 2
- **Issue:** Plan suggested 9/10 `../` levels; actual correct depth is 8 (request/complete) and 9 (multipart/*) from route file to `apps/dashboard/auth.ts`.
- **Fix:** Used 8 `../` for `upload/request` and `upload/complete`; 9 `../` for `upload/multipart/{init,complete,abort}`. Verified via typecheck.

**3. Added 5th route `/upload/complete`**
- **Found during:** Task 2
- **Issue:** Plan frontmatter listed 4 routes but action text instructed to add a 5th internal `complete` route.
- **Fix:** Added `apps/dashboard/src/app/api/internal/projects/[slug]/upload/complete/route.ts` — HEADs R2, catches 403/404 per Pitfall 4, flips status, increments UsageRecord.

**4. Lucide `AlertCircle` cannot wrap a `<title>` child**
- **Found during:** Task 3 initial write
- **Issue:** Lucide icons accept `aria-label` but children throw TS errors.
- **Fix:** Used self-closing `<AlertCircle />` with per-item `title` attribute on the error text element instead.

### Out of scope / deferred

- **`pnpm lint`** fails at repo-level config load (`eslint.config.mjs` imports `@uploadkit/config` but the package is `@uploadkitdev/config`). Pre-existing issue, unrelated to this task. Logged.
- **Usage alert emails / Stripe MeterEvents**: The public `apps/api` upload-complete has ~100 lines of threshold-crossing email logic + meter event firing. Dashboard route does not replicate this — dashboard uploads still increment UsageRecord, and the next SDK-path upload will trigger the alerts. Feature parity deferred.
- **R2_BUCKET / R2_* env vars**: dashboard will need these at runtime. Not added to env schema here; smoke test will surface missing vars if absent.

## Threat Flags

None — all routes use existing session-auth pattern from `files/route.ts` and never expose R2 credentials to the browser.

## Self-Check: PASSED

Files created/modified verified on disk:
- FOUND: apps/dashboard/src/lib/storage.ts
- FOUND: apps/dashboard/src/lib/presign.ts
- FOUND: apps/dashboard/src/app/api/internal/projects/[slug]/upload/request/route.ts
- FOUND: apps/dashboard/src/app/api/internal/projects/[slug]/upload/complete/route.ts
- FOUND: apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/init/route.ts
- FOUND: apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/complete/route.ts
- FOUND: apps/dashboard/src/app/api/internal/projects/[slug]/upload/multipart/abort/route.ts
- FOUND: apps/dashboard/src/components/file-browser/dashboard-upload-dropzone.tsx
- FOUND: apps/dashboard/src/components/file-browser/file-browser.tsx (modified)

Commits verified in git log:
- FOUND: 871de6c
- FOUND: 0433cf5
- FOUND: 539d13b
