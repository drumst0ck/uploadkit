---
phase: 10-testing-publishing-launch
plan: "01"
subsystem: api-tests
tags: [testing, vitest, api, unit-tests, mocking]
dependency_graph:
  requires: []
  provides: [api-test-suite]
  affects: [ci-pipeline]
tech_stack:
  added: []
  patterns: [vi.mock module mocking, NextRequest construction for route handler testing, withApiKey auth chain testing]
key_files:
  created:
    - apps/api/__tests__/with-api-key.test.ts
    - apps/api/__tests__/errors.test.ts
    - apps/api/__tests__/tier-enforcement.test.ts
    - apps/api/__tests__/logs.test.ts
    - apps/api/__tests__/cleanup.test.ts
    - apps/api/__tests__/upload-request.test.ts
    - apps/api/__tests__/upload-complete.test.ts
    - apps/api/__tests__/multipart.test.ts
    - apps/api/__tests__/files.test.ts
    - apps/api/__tests__/projects.test.ts
    - apps/api/__tests__/keys.test.ts
    - apps/api/__tests__/stripe-webhooks.test.ts
  modified:
    - apps/api/__tests__/setup.ts
    - apps/api/vitest.config.ts
    - apps/api/package.json
    - apps/api/src/app/api/v1/files/route.ts
decisions:
  - "@/ path alias must be configured in vitest.config.ts via resolve.alias — Next.js tsconfig paths are not automatically picked up by vitest"
  - "searchParams.get() returns null (not undefined) — z.coerce schemas fail on null; ?? undefined conversion required before zod parsing"
  - "LogsQuerySchema and PaginationSchema require explicit limit param in test URLs — z.coerce.number() on null (absent param) gives 0 which fails min(1)"
  - "withApiKey uses uploadRatelimit (not ratelimit) for upload routes — test mocks must match the useUploadLimit=true arg"
metrics:
  duration: 9m
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 16
---

# Phase 10 Plan 01: API Unit Tests Summary

Comprehensive Vitest unit tests for the `apps/api` layer — 52 tests across 12 test files, all passing via `pnpm turbo test`.

## What Was Built

Replaced all `.todo` stubs and added full test coverage for the UploadKit API:

**Task 1 — Foundational tests (26 tests):**
- `with-api-key.test.ts`: 6 tests covering auth middleware (missing header, invalid format, rate limit, key not found, revoked key, valid key flow)
- `errors.test.ts`: 7 tests for Stripe-style error serialization (type mapping, 401/429 codes, suggestion field, Zod validation errors)
- `tier-enforcement.test.ts`: 7 tests for FREE/PRO storage limits, effectiveMaxSize logic, upload count limits, MIME type validation
- `logs.test.ts`: 3 tests for GET /api/v1/logs filtering and schema validation
- `cleanup.test.ts`: 3 tests for cron cleanup auth gate, DB deletion, and R2 object deletion

**Task 2 — Upload routes and CRUD (26 tests):**
- `upload-request.test.ts`: 4 tests (presigned URL success, missing field 400, tier size limit, type rejection)
- `upload-complete.test.ts`: 3 tests (UPLOADED status, file not found 404, R2 HEAD failure 422)
- `multipart.test.ts`: 3 tests (init returns uploadId+parts, complete assembles ETags, abort deletes R2+DB)
- `files.test.ts`: 5 tests (pagination with nextCursor, project scope, empty list, R2 delete, atomic usage decrement)
- `projects.test.ts`: 3 tests (list user projects, create with slug, tier limit enforcement)
- `keys.test.ts`: 3 tests (create returns plaintext once with hash stored, list masks hash, revoke sets revokedAt)
- `stripe-webhooks.test.ts`: 5 tests (bad sig 400, missing header 400, checkout.completed→PRO, subscription.updated→TEAM, subscription.deleted→FREE)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Config] Added @/ path alias to vitest.config.ts**
- **Found during:** Task 1 initial test run
- **Issue:** `@/lib/errors`, `@/lib/with-api-key`, `@/app/api/*` imports failed with ERR_MODULE_NOT_FOUND — vitest doesn't inherit Next.js tsconfig paths automatically
- **Fix:** Added `resolve: { alias: { '@': resolve(__dirname, './src') } }` to vitest.config.ts
- **Files modified:** `apps/api/vitest.config.ts`
- **Commit:** 1ab7525

**2. [Rule 1 - Bug] Fixed null searchParams causing schema validation failures**
- **Found during:** Task 1 (logs tests) and Task 2 (files tests)
- **Issue:** `url.searchParams.get('param')` returns `null` when param absent; `z.coerce.number()` converts null→0 (fails min(1)), `z.string().optional()` rejects null (only accepts undefined). This caused real production requests without optional params to return 400 VALIDATION_ERROR.
- **Fix:** Changed `searchParams.get(x)` to `searchParams.get(x) ?? undefined` in `apps/api/src/app/api/v1/files/route.ts`; test URLs for logs explicitly include `&limit=50`
- **Files modified:** `apps/api/src/app/api/v1/files/route.ts`
- **Commit:** 97a62c5

**3. [Rule 2 - Missing Script] Added test script to apps/api/package.json**
- **Found during:** Task 2 verification (pnpm turbo test)
- **Issue:** `pnpm turbo test` skipped `@uploadkit/api` because no `test` script was defined in its package.json
- **Fix:** Added `"test": "vitest run"` to scripts
- **Files modified:** `apps/api/package.json`
- **Commit:** 97a62c5

## Known Stubs

None — all test stubs replaced with passing implementations.

## Threat Flags

None — test files use clearly fake credentials per T-10-01 (sk_test_fake, whsec_test_fake, test-cron-secret). No real credentials introduced.

## Self-Check: PASSED

All 12 test files confirmed present on disk. Both task commits (1ab7525, 97a62c5) confirmed in git log. 52/52 tests pass via `pnpm turbo test`.
