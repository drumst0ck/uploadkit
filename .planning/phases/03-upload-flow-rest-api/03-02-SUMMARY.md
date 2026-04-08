---
phase: 03-upload-flow-rest-api
plan: "02"
subsystem: api
tags: [upload, presigned-url, multipart, r2, s3, tier-limits, qstash, mongoose]

requires:
  - phase: 03-01
    provides: withApiKey HOF, serializeError/serializeValidationError, enqueueWebhook, Zod schemas, File/FileRouter/UsageRecord models

provides:
  - POST /api/v1/upload/request — presigned PUT URL generation with tier limit enforcement
  - POST /api/v1/upload/complete — R2 HEAD verification, UPLOADED status, atomic usage increment, QStash webhook
  - POST /api/v1/upload/multipart/init — multipart upload creation with all presigned part URLs up-front
  - POST /api/v1/upload/multipart/complete — ETag assembly, CompleteMultipartUpload, usage increment, webhook
  - POST /api/v1/upload/multipart/abort — AbortMultipartUpload and File record deletion

affects:
  - phase-04-sdk (calls all 5 endpoints from @uploadkit/core)
  - phase-07-dashboard (files list/browser shows UPLOADED files)

tech-stack:
  added: []
  patterns:
    - Presigned PUT URL flow — client uploads directly to R2, server never proxies bytes
    - All-parts-up-front multipart — server generates all N presigned part URLs in one response
    - R2 HEAD verify before UPLOADED — catches both 403 and 404 (S3ServiceException check)
    - Atomic $inc for UsageRecord — upsert with findOneAndUpdate avoids race conditions
    - Fire-and-forget webhook — void enqueueWebhook() after usage increment
    - exactOptionalPropertyTypes compliance — conditional spreads for optional metadata/slug

key-files:
  created:
    - apps/api/src/app/api/v1/upload/request/route.ts
    - apps/api/src/app/api/v1/upload/complete/route.ts
    - apps/api/src/app/api/v1/upload/multipart/init/route.ts
    - apps/api/src/app/api/v1/upload/multipart/complete/route.ts
    - apps/api/src/app/api/v1/upload/multipart/abort/route.ts
  modified: []

key-decisions:
  - "effectiveMaxSize = Math.min(fileRouter.maxFileSize, TIER_LIMITS[tier].maxFileSizeBytes) enforces the more restrictive of route-level and tier-level size limits"
  - "Multipart minimum set at 10MB (>10MB check), R2 part size hardcoded at 5MiB per spec"
  - "R2 HEAD catches both 403 and 404 from S3ServiceException.$response.statusCode — R2 returns 403 for missing objects when bucket has restricted GetObject policy (Pitfall 4)"
  - "routeSlug for webhook lookup extracted from key[1] with undefined guard to satisfy exactOptionalPropertyTypes"

patterns-established:
  - "Optional metadata: use ...(metadata !== undefined ? { metadata } : {}) with exactOptionalPropertyTypes strict"
  - "Optional slug query: guard string|undefined with ternary before Mongoose findOne to satisfy strict types"

requirements-completed: [UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-05, UPLD-06, UPLD-07, UPLD-08]

duration: ~3min
completed: 2026-04-08
---

# Phase 03 Plan 02: Upload Pipeline Summary

**Presigned URL pipeline delivering all 5 upload lifecycle endpoints — single-file and multipart flows with tier-limit enforcement, atomic usage tracking, R2 HEAD verification, and async QStash webhooks**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-08T12:52:10Z
- **Completed:** 2026-04-08T12:55:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Complete single-file upload pipeline: request (presigned PUT URL) → direct R2 upload → complete (HEAD verify + UPLOADED status + atomic usage + webhook)
- Complete multipart pipeline: init (all part URLs up-front, 5 MiB parts) → client assembles → complete (CompleteMultipartUpload + usage + webhook) or abort (AbortMultipartUpload + delete record)
- Tier limits enforced at presign time: file size (min of fileRouter and tier), content type, storage quota, monthly upload count

## Task Commits

1. **Task 1: Single-file upload request and complete endpoints** - `4666989` (feat)
2. **Task 2: Multipart upload endpoints (init, complete, abort)** - `940745f` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `apps/api/src/app/api/v1/upload/request/route.ts` — Presigned PUT URL generation with full tier validation
- `apps/api/src/app/api/v1/upload/complete/route.ts` — R2 HEAD verification, status update, usage increment, QStash webhook
- `apps/api/src/app/api/v1/upload/multipart/init/route.ts` — R2 multipart initiation, all part URLs generated up-front
- `apps/api/src/app/api/v1/upload/multipart/complete/route.ts` — CompleteMultipartUpload with ETags, usage increment, webhook
- `apps/api/src/app/api/v1/upload/multipart/abort/route.ts` — AbortMultipartUpload and File record deletion

## Decisions Made

- `effectiveMaxSize = Math.min(fileRouter.maxFileSize, TIER_LIMITS[tier].maxFileSizeBytes)` — enforces the more restrictive of per-route and per-tier limits, keeping both config surfaces authoritative
- Multipart minimum threshold: 10 MiB (> not >=) — files exactly 10 MiB use single upload; only files strictly above 10 MiB qualify
- R2 HEAD catches both 403 and 404 from `S3ServiceException.$response?.statusCode` — R2 can return 403 for missing objects when the bucket's GetObject policy is restricted (documented R2 pitfall)
- routeSlug for webhook lookup extracted as `key.split('/')[1]` with an `undefined` guard before Mongoose query — required for TypeScript `exactOptionalPropertyTypes: true`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `string | undefined` query argument rejected by Mongoose under exactOptionalPropertyTypes**
- **Found during:** Task 1 (upload complete endpoint) — first build
- **Issue:** `file.key.split('/')[1]` returns `string | undefined`; passing it as `slug:` in Mongoose `findOne()` fails TypeScript strict check (`exactOptionalPropertyTypes: true`)
- **Fix:** Added `const routeSlugPart = file.key.split('/')[1]` then ternary: `routeSlugPart ? FileRouter.findOne({ ..., slug: routeSlugPart }) : null`
- **Files modified:** apps/api/src/app/api/v1/upload/complete/route.ts
- **Verification:** Build passed after fix
- **Committed in:** 4666989 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed optional metadata spread rejected under exactOptionalPropertyTypes**
- **Found during:** Task 1 (upload request endpoint) — second build
- **Issue:** Passing `metadata` (type `Record<string, unknown> | undefined`) directly into `File.create({..., metadata})` fails because Mongoose schema's strict type disallows `undefined` when `exactOptionalPropertyTypes: true`
- **Fix:** Replaced direct spread with conditional: `...(metadata !== undefined ? { metadata } : {})`
- **Files modified:** apps/api/src/app/api/v1/upload/request/route.ts, also applied to multipart/init and multipart/complete proactively
- **Verification:** Build passed after fix
- **Committed in:** 4666989 (Task 1 commit), 940745f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — TypeScript strict mode bugs)
**Impact on plan:** Both fixes are mechanical TypeScript compliance requirements. No scope change, no behaviour change.

## Issues Encountered

None beyond the auto-fixed TypeScript strict mode issues above.

## User Setup Required

None — no external service configuration required beyond what Plan 01 established.

## Next Phase Readiness

- All 5 upload route handlers are registered, type-safe, and building cleanly
- SDK (Phase 4) can immediately call POST /api/v1/upload/request and POST /api/v1/upload/multipart/init to begin upload flows
- UPLD-05 (progress tracking) server contract satisfied: presigned PUT/part URLs are returned, SDK uses XHR onprogress against them
- UPLD-07 (retry contract) satisfied: 5xx/429 = retryable, 4xx = non-retryable per errors.ts established in Plan 01

## Known Stubs

None — all endpoints are fully wired with real R2 operations, Mongoose persistence, and QStash webhooks.

## Threat Surface Scan

All mitigations from the plan's threat model are implemented:
- T-03-07 (Spoofing): ContentType and ContentLength locked in presigned URL signature via `generatePresignedPutUrl` — client cannot change type after presigning
- T-03-08 (Tampering): HEAD verification in R2 before marking UPLOADED in `complete/route.ts`
- T-03-09 (Elevation): All File lookups scoped by `projectId: ctx.project._id` from withApiKey context
- T-03-10 (DoS): Tier limit checks (storage quota, upload count, file size) execute BEFORE presigning
- T-03-11 (Info Disclosure): Multipart part URLs signed with `expiresIn: 3600` — 1h expiry, cannot list or delete
- T-03-12 (Tampering/accepted): ETags from client are validated by R2's CompleteMultipartUpload internally; invalid ETags cause R2 to return an error which is propagated as 500

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED
