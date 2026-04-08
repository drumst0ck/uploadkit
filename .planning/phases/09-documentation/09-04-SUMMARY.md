---
phase: 09-documentation
plan: "04"
subsystem: docs
tags: [documentation, api-reference, guides, dashboard, migration]
dependency_graph:
  requires: [09-03]
  provides: [full-docs-coverage, api-reference, guides, dashboard-docs]
  affects: []
tech_stack:
  added: []
  patterns: [fumadocs-mdx, tab-components, callout-components]
key_files:
  created:
    - apps/docs/content/docs/api-reference/rest-api.mdx
    - apps/docs/content/docs/api-reference/authentication.mdx
    - apps/docs/content/docs/api-reference/upload.mdx
    - apps/docs/content/docs/api-reference/files.mdx
    - apps/docs/content/docs/api-reference/projects.mdx
    - apps/docs/content/docs/api-reference/webhooks.mdx
    - apps/docs/content/docs/api-reference/errors.mdx
    - apps/docs/content/docs/guides/image-upload.mdx
    - apps/docs/content/docs/guides/avatar-upload.mdx
    - apps/docs/content/docs/guides/document-upload.mdx
    - apps/docs/content/docs/guides/multipart-upload.mdx
    - apps/docs/content/docs/guides/custom-styling.mdx
    - apps/docs/content/docs/guides/migration-from-uploadthing.mdx
    - apps/docs/content/docs/dashboard/overview.mdx
    - apps/docs/content/docs/dashboard/projects.mdx
    - apps/docs/content/docs/dashboard/files.mdx
    - apps/docs/content/docs/dashboard/api-keys.mdx
    - apps/docs/content/docs/dashboard/billing.mdx
  modified: []
decisions:
  - "All curl examples use uk_live_xxxxxxxxxxxxxxxxxxxxx placeholder per T-09-05 threat mitigation"
  - "Billing page tier limits sourced from TIER_LIMITS constants (Free: 5GB/2GB BW/4MB file, Pro: 100GB/200GB BW/512MB, Team: 1TB/2TB BW/5GB, Enterprise: Unlimited/10GB)"
  - "migration-from-uploadthing.mdx uses before/after Tabs pattern for file router and component comparison"
  - "Error codes sourced from packages/shared/src/errors.ts class definitions"
metrics:
  duration: "8 minutes"
  completed_date: "2026-04-08"
  tasks: 2
  files: 18
requirements:
  - DOCS-08
  - DOCS-09
  - DOCS-10
---

# Phase 09 Plan 04: REST API Reference, Guides, and Dashboard Docs Summary

18 MDX pages completing all UploadKit documentation coverage — REST API reference with curl examples, 6 task-oriented guides including a competitive migration page, and 5 dashboard reference docs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | REST API reference (7 pages) | 5d60530 | api-reference/*.mdx (7 files) |
| 2 | Guides and dashboard documentation (11 pages) | 328cd20 | guides/*.mdx (6), dashboard/*.mdx (5) |

## What Was Built

### Task 1: REST API Reference

7 pages covering every REST endpoint:

- **rest-api.mdx** — Overview: base URL `https://api.uploadkit.dev/api/v1`, auth model, rate limiting (sliding window, 429 + Retry-After), cursor pagination
- **authentication.mdx** — `uk_live_` / `uk_test_` key types, `x-api-key` header, SHA-256 hashing security model, 401 handling. Links to `/docs/core-concepts/security`
- **upload.mdx** — 5 endpoints: request presigned URL, confirm upload, multipart init/complete/abort. Each with request body table (from UploadRequestSchema, UploadCompleteSchema, MultipartInitSchema etc.), response shape, curl example, error cases
- **files.mdx** — List (paginated), get by key, PATCH metadata, DELETE with R2 hard delete note
- **projects.mdx** — CRUD with tier-based project limits table, cascading delete warning
- **webhooks.mdx** — `onUploadComplete` payload shape, QStash signature verification code, retry schedule, DLQ handling
- **errors.mdx** — Complete error code table (UNAUTHORIZED, FILE_TOO_LARGE, FILE_TYPE_NOT_ALLOWED, UPLOAD_NOT_FOUND, UPLOAD_NOT_VERIFIED, NOT_FOUND, TIER_LIMIT_EXCEEDED, RATE_LIMITED, INTERNAL_SERVER_ERROR), rate limit headers, TypeScript error handling example

### Task 2: Guides and Dashboard Documentation

6 guides (task-oriented, copy-pasteable):

- **image-upload.mdx** — Next.js / React API key tabs, file route config with allowedTypes, UploadDropzone, FilePreview, onUploadComplete result handling
- **avatar-upload.mdx** — Single file `maxFileCount: 1`, circular preview, replace-existing pattern (store key, delete old in onUploadComplete)
- **document-upload.mdx** — PDF/Word MIME types, 50 MB limit, custom dropzone content, metadata category tagging, MIME type reference table
- **multipart-upload.mdx** — Automatic >10 MB trigger, progress callback, abort cleanup, core SDK `maxRetries`, tier file size limits table
- **custom-styling.mdx** — 4 levels: CSS vars (`--uk-*`), `className` prop, `appearance` prop with keys table, `useUploadKit` full custom UI example, dark mode patterns
- **migration-from-uploadthing.mdx** — Full API equivalents table (8 mappings), key differences (chain vs object, endpoint vs route, BYOS, CSS theming), step-by-step migration with before/after Tabs, what's new in UploadKit

5 dashboard reference pages:

- **overview.mdx** — Signup flow, metric cards, upload chart, upload logs, sidebar navigation
- **projects.mdx** — Create project, project limits by tier, rename, switch, cascading delete with confirmation step
- **files.mdx** — File browser columns, search/filter options, image/PDF/other preview, bulk delete, upload logs (5s polling)
- **api-keys.mdx** — Live vs test key types, create flow, plaintext shown once warning, masked display, revoke, key limits by tier
- **billing.mdx** — Tier comparison table (Free/Pro/Team/Enterprise) with accurate limits from TIER_LIMITS constants, overage rates ($0.02/GB storage, $0.01/GB bandwidth, $0.001/upload), Stripe Checkout flow, Billing Portal, cancellation behavior

## Deviations from Plan

None — plan executed exactly as written. All threat mitigations applied (T-09-05: curl examples use `uk_live_xxxxxxxxxxxxxxxxxxxxx` placeholder throughout).

## Known Stubs

None. All documentation content is complete and accurate. Tier limits in billing.mdx were sourced from `packages/shared/src/constants.ts` TIER_LIMITS (not plan prose) to ensure accuracy.

## Threat Flags

None. This is a content-only plan. All curl examples use placeholder API keys per T-09-05.

## Verification

- `pnpm --filter @uploadkit/docs build` passed with 50 static pages generated (zero errors, zero TypeScript errors)
- All 18 new pages render in their correct sidebar sections
- Migration guide covers all 8 UploadThing API equivalents with before/after code tabs
- API reference curl examples use correct schemas from schemas.ts
- Billing page tier limits match TIER_LIMITS constant values exactly

## Self-Check: PASSED

All 18 files verified to exist on disk. Commits 5d60530 and 328cd20 confirmed in git log.
