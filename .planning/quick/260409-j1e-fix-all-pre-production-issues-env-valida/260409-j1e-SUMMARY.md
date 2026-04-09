---
phase: quick-260409-j1e
plan: 01
subsystem: api, dashboard, web, docs
tags: [hardening, env-validation, stripe, seo, docs, error-boundaries, favicon]
dependency_graph:
  requires: []
  provides:
    - apps/api/src/lib/env.ts
    - apps/dashboard/src/lib/env.ts
    - apps/dashboard/src/app/dashboard/error.tsx
    - apps/dashboard/src/app/global-error.tsx
    - apps/web/public/robots.txt
    - apps/web/src/app/sitemap.ts
  affects:
    - apps/api/src/app/layout.tsx
    - apps/dashboard/src/app/layout.tsx
    - apps/api/src/app/api/v1/webhooks/stripe/route.ts
    - scripts/seed.ts
    - apps/dashboard/src/app/page.tsx
    - apps/web/src/app/layout.tsx
    - apps/docs/content/docs/getting-started/quickstart.mdx
    - apps/docs/content/docs/getting-started/api-only.mdx
    - apps/docs/content/docs/api-reference/files.mdx
    - apps/docs/content/docs/core-concepts/file-routes.mdx
tech_stack:
  added: []
  patterns:
    - Env validation module imported at top of layout.tsx for fail-fast startup
    - Next.js MetadataRoute.Sitemap for dynamic sitemap generation
    - use client error boundary with reset() callback
key_files:
  created:
    - apps/api/src/lib/env.ts
    - apps/dashboard/src/lib/env.ts
    - apps/dashboard/src/app/dashboard/error.tsx
    - apps/dashboard/src/app/global-error.tsx
    - apps/dashboard/public/favicon.svg
    - apps/web/public/favicon.svg
    - apps/web/public/robots.txt
    - apps/web/src/app/sitemap.ts
  modified:
    - apps/api/src/app/layout.tsx
    - apps/api/src/app/api/v1/webhooks/stripe/route.ts
    - apps/dashboard/src/app/layout.tsx
    - apps/dashboard/src/app/page.tsx
    - apps/web/src/app/layout.tsx
    - scripts/seed.ts
    - apps/docs/content/docs/getting-started/quickstart.mdx
    - apps/docs/content/docs/getting-started/api-only.mdx
    - apps/docs/content/docs/api-reference/files.mdx
    - apps/docs/content/docs/core-concepts/file-routes.mdx
decisions:
  - Env validation uses throw at module import time so server fails at startup with clear message
  - mapPriceToTier now throws on unknown price IDs — no silent conservative fallback
  - Seed API key masked with slice(0,12)...slice(-4) in both log lines
  - Favicon uses indigo-to-violet gradient matching brand accent colors
  - sitemap.ts uses MetadataRoute.Sitemap (correct Next.js type — not MetadataSiteMap)
metrics:
  duration: 15m
  completed_date: "2026-04-09T11:50:47Z"
  tasks: 3
  files: 18
---

# Quick Task 260409-j1e: Fix all pre-production issues — env validation, SEO, docs accuracy

**One-liner:** Env validation fail-fast modules, Stripe throw on unknown price IDs, masked seed output, error boundary pages, root redirect, favicons with metadata, robots.txt + sitemap, and 4 doc corrections across route path, response fields, list key, and status enum.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API/dashboard hardening | 5a8441e | 12 files created/modified |
| 2 | Web SEO — robots.txt and sitemap | 84e0bc6 | 2 files created |
| 3 | Fix docs inaccuracies | 69bbbea | 4 files modified |

## What Was Changed

### Task 1 — API/Dashboard Hardening

**Env validation (A/B):** Created `apps/api/src/lib/env.ts` and `apps/dashboard/src/lib/env.ts`. Each module iterates a `required` array and throws `Error("[env] Missing required environment variable: KEY")` at import time. Both are imported as the very first line of their respective `layout.tsx` files so the server fails fast with a clear message rather than crashing at the first DB/auth call.

**Stripe mapPriceToTier (C):** Replaced the silent `return 'PRO'` fallback with an explicit throw: `throw new Error("Unknown Stripe price ID: ${priceId}")`. Unknown price IDs now cause the webhook handler to enter the catch block (which returns 200 to Stripe to prevent retry storms) while logging the error for investigation.

**Seed masking (D):** Both `console.log` lines that emitted the plaintext key were replaced with `${plainKey.slice(0, 12)}...${plainKey.slice(-4)}` — shows enough for identification without exposing the full secret.

**Error pages (E):** Created `apps/dashboard/src/app/dashboard/error.tsx` (dashboard-scoped boundary) and `apps/dashboard/src/app/global-error.tsx` (root-level with `<html><body>` wrapper). Both are `'use client'` components receiving `{ error, reset }` props with a useEffect to log errors and a retry button.

**Root redirect (F):** `apps/dashboard/src/app/page.tsx` now contains only `redirect('/dashboard')` — visiting the dashboard root URL redirects immediately to the main dashboard page.

**Favicons (G):** Created identical `favicon.svg` files in `apps/dashboard/public/` and `apps/web/public/` — indigo-to-violet gradient rounded square with a white upload arrow (up stroke + baseline). Both `layout.tsx` files now have `icons: { icon: '/favicon.svg' }` merged into the `metadata` export.

### Task 2 — Web SEO

**robots.txt:** Created `apps/web/public/robots.txt` with `User-agent: *`, `Allow: /`, and `Sitemap: https://uploadkit.dev/sitemap.xml`.

**sitemap.ts:** Created `apps/web/src/app/sitemap.ts` using `MetadataRoute.Sitemap` (the correct Next.js 16 type from `'next'`). Returns homepage (priority 1, weekly) and /pricing (priority 0.8, monthly). The build output confirmed `/sitemap.xml` as a static route.

### Task 3 — Docs Accuracy

| File | Fix |
|------|-----|
| `quickstart.mdx` | Route path changed from `app/api/uploadkit/route.ts` to `app/api/uploadkit/[...uploadkit]/route.ts` (both prose and code block title) |
| `api-only.mdx` | `presignedUrl` → `uploadUrl`, removed `expiresAt`, added `cdnUrl` and `key` to response example; upload section JS/Python updated to use `uploadUrl`/`upload_url`; status `"complete"` → `"UPLOADED"` |
| `files.mdx` | List response key `"items"` → `"files"` |
| `file-routes.mdx` | `file.status` comment `"complete"` → `"UPLOADED"` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apiKey prop on UploadKitProvider in web demo components**

- **Found during:** Build verification after Task 3
- **Issue:** `apps/web` TypeScript build failed with `Property 'apiKey' does not exist on type 'IntrinsicAttributes & UploadKitProviderProps'`. Two files still passed `apiKey="demo"` to `UploadKitProvider` — a regression from the 260409-i9f SDK endpoint-proxy refactor that removed `apiKey` from the browser-facing provider API.
- **Fix:** Replaced `apiKey="demo"` with `endpoint="/api/uploadkit"` in `code-demo-client.tsx` and `component-showcase.tsx`
- **Files modified:** `apps/web/src/components/code-demo/code-demo-client.tsx`, `apps/web/src/components/showcase/component-showcase.tsx`
- **Commit:** a8f9e1e

## Build Verification

All three apps build successfully after fixes:

- `@uploadkit/api` — compiled successfully, TypeScript clean
- `@uploadkit/dashboard` — compiled successfully, all routes (including `/dashboard`) server-rendered on demand
- `@uploadkit/web` — compiled successfully; `/sitemap.xml` appears as a static route in build output

## Known Stubs

None — all changes are either new validation modules, error boundary pages, static SEO files, or doc text corrections. No data-rendering stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. `env.ts` modules run server-side only.

## Self-Check: PASSED

All 8 created files confirmed present on disk. All 4 commits (5a8441e, 84e0bc6, 69bbbea, a8f9e1e) confirmed in git log. All three app builds pass.
