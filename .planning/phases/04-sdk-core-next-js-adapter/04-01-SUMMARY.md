---
phase: 04-sdk-core-next-js-adapter
plan: "01"
subsystem: "@uploadkit/core"
tags: [sdk, typescript, upload, multipart, retry, xhr, esm, cjs]
dependency_graph:
  requires:
    - "@uploadkit/shared (workspace:*) — UploadKitError class and shared types"
    - "packages/core/tsup.config.ts — build configuration from Phase 1"
  provides:
    - "createUploadKit({ apiKey }) factory — main consumer entry point"
    - "UploadKitClient class — upload, listFiles, deleteFile methods"
    - "executeUpload — single/multipart gateway at 10MB threshold"
    - "withRetry — exponential backoff, 5xx/429 only, AbortSignal"
    - "fetchApi — typed fetch wrapper with Authorization header"
    - "validateFile — client-side file constraint checking"
    - "ESM + CJS dual output with .d.ts declarations"
  affects:
    - "04-02 (@uploadkit/next) — imports @uploadkit/core as dependency"
tech_stack:
  added: []
  patterns:
    - "XHR for file PUT (not fetch) — enables upload.onprogress events"
    - "Multipart concurrency via Promise.all batches of 3"
    - "Private class fields (#apiKey) to prevent key enumeration (T-04-05)"
    - "tsup external:[] so @uploadkit/shared gets bundled into dist"
    - "DOM lib added to tsconfig for File, AbortSignal, XMLHttpRequest types"
key_files:
  created:
    - packages/core/src/types.ts
    - packages/core/src/http.ts
    - packages/core/src/retry.ts
    - packages/core/src/validation.ts
    - packages/core/src/single.ts
    - packages/core/src/multipart.ts
    - packages/core/src/upload.ts
    - packages/core/src/client.ts
    - packages/core/tests/retry.test.ts
    - packages/core/tests/client.test.ts
    - packages/core/tests/upload.test.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/package.json
    - packages/core/tsconfig.json
decisions:
  - "DOM lib added to packages/core/tsconfig.json — core uses browser globals (File, AbortSignal, XHR) so ES2022 alone is insufficient"
  - "exports map types condition moved before import/require — correct resolution order for TypeScript consumers"
  - "@uploadkit/shared listed in dependencies (not devDependencies) and NOT in tsup external[] — it gets bundled into dist, giving consumers zero transitive runtime deps"
  - "AbortSignal check happens before first fn() call in withRetry — pre-aborted signals short-circuit immediately with UPLOAD_ABORTED"
  - "Multipart abort on any error (Pitfall 3) — cleanup via POST /api/v1/upload/multipart/abort prevents orphaned R2 uploads"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 3
  files_changed: 13
---

# Phase 04 Plan 01: @uploadkit/core SDK Summary

**One-liner:** Zero-dependency TypeScript upload client with XHR progress, 10MB single/multipart gateway, exponential backoff retry, and clean ESM+CJS dual build.

## What Was Built

`@uploadkit/core` is the foundational SDK package that all framework adapters build on. It handles the entire presigned URL upload flow programmatically.

### Module Architecture

```
src/index.ts          — createUploadKit() factory + public re-exports
src/client.ts         — UploadKitClient class (upload, listFiles, deleteFile)
src/upload.ts         — executeUpload() — 10MB threshold gateway
src/single.ts         — singleUpload() via XHR PUT with onprogress
src/multipart.ts      — multipartUpload() via concurrent 5MB parts (CONCURRENCY=3)
src/http.ts           — fetchApi<T>() typed fetch wrapper
src/retry.ts          — withRetry() exponential backoff, 5xx/429 only
src/validation.ts     — validateFile() client-side constraint checking
src/types.ts          — all public SDK types
```

### Key Behaviors

- `createUploadKit({ apiKey })` returns `UploadKitClient` with `upload`, `listFiles`, `deleteFile`
- `upload()` calls `executeUpload` which routes to `singleUpload` (≤10MB) or `multipartUpload` (>10MB)
- Single upload: `fetchApi → POST /api/v1/upload/request` → `XHR PUT` (with progress) → `fetchApi → POST /api/v1/upload/complete`
- Multipart: `init → concurrent parts in batches of 3 → ETag collection → complete` (abort on error)
- `withRetry`: retries on `statusCode >= 500` OR `statusCode === 429`, checks `signal.aborted` before each attempt
- `fetchApi`: `Authorization: Bearer {apiKey}`, rejects `http://` base URLs, parses Stripe-style error body

### Build Output

```
dist/index.mjs    — ESM (10.75 KB)
dist/index.js     — CJS (12.01 KB)
dist/index.d.ts   — Type declarations
dist/index.d.mts  — ESM type declarations
```

`sideEffects: false` — tree-shakeable. `@uploadkit/shared` bundled into dist (zero transitive runtime deps for consumers).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DOM lib missing from tsconfig**
- **Found during:** Task 3 build (DTS build step)
- **Issue:** `tsconfig.base.json` uses `"lib": ["ES2022"]` — no DOM. `File`, `AbortSignal`, `XMLHttpRequest` are browser globals used throughout core source.
- **Fix:** Added `"lib": ["ES2022", "DOM"]` override in `packages/core/tsconfig.json`
- **Files modified:** `packages/core/tsconfig.json`
- **Commit:** 45c278e

**2. [Rule 3 - Blocking] package.json exports map condition order**
- **Found during:** Task 3 build (tsup emitted warning)
- **Issue:** `types` condition after `import`/`require` — TypeScript resolution ignores it per esbuild spec
- **Fix:** Moved `types` before `import` and `require` in exports map
- **Files modified:** `packages/core/package.json`
- **Commit:** 45c278e

**3. [Rule 1 - Bug] Test assertion for MISSING_API_KEY error**
- **Found during:** Task 2 GREEN phase test run
- **Issue:** `toThrow('MISSING_API_KEY')` matches against `error.message`, but `MISSING_API_KEY` is the `code` property, not the message
- **Fix:** Changed to `toMatchObject({ code: 'MISSING_API_KEY' })` via caught error inspection
- **Files modified:** `packages/core/tests/client.test.ts`
- **Commit:** 755027f

**4. [Rule 1 - Bug] Vitest fake timer + unhandled rejection in retry exhaustion test**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** `vi.useFakeTimers()` + `mockRejectedValueOnce` caused vitest to detect the rejected Promise before the test's `.catch()` handler, triggering exit code 1
- **Fix:** Last test uses `vi.useRealTimers()` + mocked `setTimeout` (resolves immediately) to avoid the async timing issue
- **Files modified:** `packages/core/tests/retry.test.ts`
- **Commit:** 58d08e2

## Security Mitigations Applied

All threat model items verified implemented:

| Threat ID | Mitigation |
|-----------|------------|
| T-04-01 | `fetchApi` sends apiKey in `Authorization` header only; never logged |
| T-04-02 | `fetchApi` throws `INSECURE_URL` error if `baseUrl` starts with `http://` |
| T-04-03 | XHR PUT sets `Content-Type: file.type` to match presigned URL signature |
| T-04-04 | `withRetry` caps at `maxRetries=3`, exponential backoff with jitter, `AbortController` support |
| T-04-05 | `UploadKitClient` stores `apiKey` in private class field (`#apiKey`) — not enumerable |
| T-04-06 | `validateFile` documented as UX convenience; server enforces authoritatively |

## Test Results

```
Test Files  3 passed (3)
     Tests  17 passed (17)
```

- `retry.test.ts` — 7 tests: success, 5xx retry, 429 retry, 4xx no-retry, abort, backoff, exhaustion
- `client.test.ts` — 6 tests: factory, missing apiKey, upload delegation, abort signal, listFiles, deleteFile
- `upload.test.ts` — 4 tests: single path (≤10MB), multipart path (>10MB), config passthrough for both

## Known Stubs

None — all modules are fully implemented with real logic wired to the API.

## Threat Flags

None — no new network surface beyond what is documented in the plan's threat model.

## Self-Check

Verified files exist:
- `packages/core/src/types.ts` — FOUND
- `packages/core/src/http.ts` — FOUND
- `packages/core/src/retry.ts` — FOUND
- `packages/core/src/validation.ts` — FOUND
- `packages/core/src/single.ts` — FOUND
- `packages/core/src/multipart.ts` — FOUND
- `packages/core/src/upload.ts` — FOUND
- `packages/core/src/client.ts` — FOUND
- `packages/core/dist/index.mjs` — FOUND
- `packages/core/dist/index.js` — FOUND
- `packages/core/dist/index.d.ts` — FOUND

Commits verified:
- `58d08e2` — feat(04-01): add types, http, retry, and validation modules
- `755027f` — feat(04-01): add upload orchestration, single/multipart upload, and client factory
- `45c278e` — chore(04-01): fix tsconfig DOM lib and exports order for @uploadkit/core build

## Self-Check: PASSED
