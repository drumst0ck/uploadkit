---
phase: 03-upload-flow-rest-api
plan: "01"
subsystem: api-foundation
tags: [api, auth, rate-limiting, zod, mongoose, qstash]
dependency_graph:
  requires: []
  provides:
    - withApiKey HOF for route auth + rate limiting
    - serializeError / serializeValidationError Stripe-style error format
    - enqueueWebhook QStash client with dev env guard
    - Zod schemas for all API endpoints
    - File.uploadId, FileRouter.webhookUrl, ApiKey.keyHash model patches
  affects:
    - apps/api/src/lib/
    - packages/db/src/models/
tech_stack:
  added:
    - "@upstash/qstash latest"
    - "bcryptjs latest"
    - "nanoid latest"
    - "vitest latest"
    - "@vitest/coverage-v8 latest"
    - "@types/bcryptjs latest"
  patterns:
    - SHA256 hash lookup (never store plaintext API keys)
    - Rate limit before DB (Upstash HTTP, no connection overhead)
    - Fire-and-forget lastUsedAt update (void Promise, non-blocking)
    - Stripe-style error JSON with retryability contract (5xx/429=retry, 4xx=no retry)
    - QStash env guard (graceful no-op in dev when QSTASH_TOKEN absent)
key_files:
  created:
    - apps/api/src/lib/errors.ts
    - apps/api/src/lib/with-api-key.ts
    - apps/api/src/lib/schemas.ts
    - apps/api/src/lib/qstash.ts
    - apps/api/vitest.config.ts
    - apps/api/__tests__/setup.ts
    - apps/api/__tests__/errors.test.ts
    - apps/api/__tests__/with-api-key.test.ts
  modified:
    - apps/api/package.json
    - apps/api/next.config.ts
    - packages/db/src/models/file.ts
    - packages/db/src/models/file-router.ts
    - packages/db/src/models/api-key.ts
decisions:
  - "ApiKey model stores keyHash (SHA256 hex) + keyPrefix (first 12 chars for display) — plaintext key never persisted (T-03-01)"
  - "Rate limit runs before DB lookup using Upstash HTTP to minimize latency on rejected requests (T-03-05)"
  - "withApiKey casts populated Mongoose doc to IApiKey via unknown — runtime safe since consumers use ctx.project, not ctx.apiKey.projectId"
  - "QStash client null-guarded on QSTASH_TOKEN — enqueueWebhook is a no-op in dev with console.warn"
  - "next.config.ts adds serverExternalPackages: ['mongoose'] to prevent Turbopack from bundling native Mongoose"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-07"
  tasks_completed: 3
  files_changed: 13
---

# Phase 03 Plan 01: API Foundation Layer Summary

API foundation layer built: `withApiKey` auth wrapper with SHA256 key hashing and Upstash rate limiting, Stripe-style error serializer with UPLD-07 retryability contract, QStash webhook client, Zod v4 schemas for all endpoints, Mongoose model patches (File.uploadId, FileRouter.webhookUrl, ApiKey.keyHash), and vitest test scaffolds.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Vitest config and test scaffolds | 9252032 | vitest.config.ts, __tests__/setup.ts, errors.test.ts, with-api-key.test.ts, package.json |
| 1 | Package deps, model patches, QStash client | 1bd33af | package.json, next.config.ts, file.ts, file-router.ts, api-key.ts, qstash.ts |
| 2 | withApiKey wrapper, error serializer, Zod schemas | 1b2fbfe | errors.ts, with-api-key.ts, schemas.ts |

## What Was Built

### `apps/api/src/lib/errors.ts`
- `serializeError(err)` — maps `UploadKitError` subclasses to `{ error: { type, code, message, suggestion? } }` JSON
- `serializeValidationError(zodError)` — maps Zod `flatten().fieldErrors` to `details` field
- `ERROR_TYPE_MAP` covers 400/401/403/404/422/429/500 status codes
- UPLD-07 contract: 5xx and 429 are retryable; 4xx (except 429) are non-retryable

### `apps/api/src/lib/with-api-key.ts`
- `withApiKey(handler, useUploadLimit?)` HOF wraps any Next.js App Router route handler
- Extracts `Authorization: Bearer <token>` header; returns 401 if missing/malformed
- Rate limits BEFORE DB using Upstash sliding window (10/min general, 30/min upload)
- Hashes token with `node:crypto` SHA256 and looks up `ApiKey.keyHash` in MongoDB
- Fire-and-forget `lastUsedAt` update on every successful auth
- Resolves `Subscription` tier (defaults to `FREE` if no subscription record)
- Exports `ApiContext { apiKey, project, tier }` for use in route handlers

### `apps/api/src/lib/schemas.ts`
- `UploadRequestSchema`, `UploadCompleteSchema` — simple upload flow
- `MultipartInitSchema`, `MultipartCompleteSchema`, `MultipartAbortSchema` — multipart flow
- `CreateProjectSchema`, `UpdateProjectSchema` — project CRUD
- `CreateApiKeySchema` — API key creation
- `CreateFileRouterSchema`, `UpdateFileRouterSchema` — file router CRUD
- `UpdateFileMetadataSchema`, `PaginationSchema`, `LogsQuerySchema` — utility schemas

### `apps/api/src/lib/qstash.ts`
- `enqueueWebhook(url, payload)` — publishes JSON to QStash with 3 retries
- Gracefully no-ops in dev when `QSTASH_TOKEN` is absent (logs warning instead of throwing)

### Model Patches
- `packages/db/src/models/file.ts` — added optional `uploadId?: string` for R2 multipart tracking
- `packages/db/src/models/file-router.ts` — added optional `webhookUrl?: string` for developer callbacks
- `packages/db/src/models/api-key.ts` — renamed `key` to `keyPrefix` (display only), added `keyHash` (SHA256, unique index)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error in withApiKey after Mongoose populate**
- **Found during:** Task 2 build verification
- **Issue:** After `.populate<{ projectId: IProject }>('projectId')`, TypeScript typed `apiKeyDoc.projectId` as `IProject` instead of `Types.ObjectId`, making the doc incompatible with `IApiKey` in `ApiContext`
- **Fix:** Cast populated doc via `as unknown as IApiKey` before passing to handler; extracted `project` separately for type-safe use
- **Files modified:** apps/api/src/lib/with-api-key.ts
- **Commit:** 1b2fbfe

## Known Stubs

None — all files are fully wired. Test scaffolds have `it.todo()` stubs intentionally (they will be filled when integration tests are added in a later plan).

## Threat Surface Scan

All new files implement mitigations from the plan's threat model:
- T-03-01 (Spoofing): SHA256 hash lookup in `with-api-key.ts` — plaintext key never in DB
- T-03-02 (Tampering): Zod `safeParse` in `schemas.ts` covers all request bodies
- T-03-03 (Repudiation): `lastUsedAt` fire-and-forget update in `with-api-key.ts`
- T-03-04 (Info Disclosure): `serializeError` never leaks stack traces; generic 500 message
- T-03-05 (DoS): Rate limiting before DB in `with-api-key.ts`
- T-03-06 (Elevation): `ApiContext` scoped to `projectId`; all future queries must filter by it

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED
