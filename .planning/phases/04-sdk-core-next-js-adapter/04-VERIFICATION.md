---
phase: 04-sdk-core-next-js-adapter
verified: 2026-04-08T16:18:00Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 4: SDK Core & Next.js Adapter — Verification Report

**Phase Goal:** `@uploadkit/core` and `@uploadkit/next` are published-ready packages that work in both managed and BYOS modes, giving Next.js developers a typed file router pattern
**Verified:** 2026-04-08T16:18:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths drawn from the ROADMAP.md success criteria and plan frontmatter must_haves.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `createUploadKit({ apiKey })` returns a client with upload, listFiles, deleteFile methods | VERIFIED | `packages/core/src/client.ts` — UploadKitClient class exports all three methods; 6 client tests pass confirming factory and all method signatures |
| 2 | upload() transparently chooses single or multipart based on file.size > 10MB threshold | VERIFIED | `packages/core/src/upload.ts` — MULTIPART_THRESHOLD = 10MB; routes to singleUpload or multipartUpload; 4 upload.test.ts tests confirm both paths |
| 3 | upload() fires onProgress(percentage) callback during upload via XHR | VERIFIED | `packages/core/src/single.ts` — xhr.upload.onprogress wired; `packages/core/src/multipart.ts` — aggregate progress per completed part batch |
| 4 | Retry with exponential backoff retries on 5xx/429 only, respects AbortController | VERIFIED | `packages/core/src/retry.ts` — isRetryable checks statusCode >= 500 OR === 429; AbortSignal checked before each attempt; 7 retry tests pass |
| 5 | listFiles returns paginated results, deleteFile removes a file by key | VERIFIED | `packages/core/src/client.ts` lines 55-77 — listFiles calls GET /api/v1/files with URLSearchParams, deleteFile calls DELETE /api/v1/files/:key |
| 6 | pnpm build produces ESM + CJS output with zero external runtime dependencies | VERIFIED | dist/ contains index.js (CJS), index.mjs (ESM), index.d.ts; peerDependencies: {}; @uploadkit/shared bundled into dist via tsup external:[] |
| 7 | createUploadKitHandler returns { GET, POST } route handlers for Next.js App Router | VERIFIED | `packages/next/src/handler.ts` — returns { GET, POST } typed as async functions accepting (Request, RouteParams); 6 handler tests pass |
| 8 | Developer defines fileRouter with satisfies FileRouter and gets typed route names | VERIFIED | `packages/next/src/types.ts` — FileRouter = Record<string, RouteConfig<any>> with JSDoc explaining satisfies pattern; AppFileRouter type inferred from keyof TRouter; DTS confirms generic propagation |
| 9 | Middleware function receives req and returns metadata that flows into onUploadComplete | VERIFIED | `packages/next/src/handler.ts` lines 87, 123 — middleware called with { req }, result passed as metadata to onUploadComplete; handler test confirms flow |
| 10 | BYOS mode uses developer's S3/R2 credentials to generate presigned URLs server-side | VERIFIED | `packages/next/src/byos.ts` — import 'server-only'; S3Client + PutObjectCommand + getSignedUrl; handler.ts routes to BYOS path when config.storage present; 7 byos tests pass |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/client.ts` | UploadKitClient with upload, listFiles, deleteFile | VERIFIED | 77 lines, full implementation, private #apiKey field (T-04-05) |
| `packages/core/src/types.ts` | UploadKitConfig, UploadOptions, UploadResult, ListFilesResult | VERIFIED | All 7 types exported including internal types |
| `packages/core/src/upload.ts` | executeUpload — single/multipart gateway | VERIFIED | MULTIPART_THRESHOLD = 10MB, routes to singleUpload or multipartUpload |
| `packages/core/src/single.ts` | singleUpload via XHR with progress | VERIFIED | xhrPut helper with xhr.upload.onprogress, AbortSignal wiring |
| `packages/core/src/multipart.ts` | Concurrent multipart with ETag collection | VERIFIED | CONCURRENCY=3, Promise.all batches, MISSING_ETAG error on missing header |
| `packages/core/src/retry.ts` | withRetry exponential backoff | VERIFIED | delay = min(1000*2^attempt + random*200, 30000), 5xx/429 only |
| `packages/core/src/http.ts` | fetchApi typed fetch wrapper | VERIFIED | Authorization: Bearer, INSECURE_URL rejection, Stripe-style error parsing |
| `packages/core/dist/index.js` | CJS build output | VERIFIED | File exists, 12.01 KB |
| `packages/core/dist/index.mjs` | ESM build output | VERIFIED | File exists, 10.75 KB |
| `packages/next/src/types.ts` | FileRouter, RouteConfig, S3CompatibleStorage, UploadedFile | VERIFIED | All 5 types exported including UploadKitHandlerConfig |
| `packages/next/src/handler.ts` | createUploadKitHandler factory | VERIFIED | import 'server-only'; GET/POST handlers; BYOS routing; try/catch error handling |
| `packages/next/src/router.ts` | parseFileSize utility | VERIFIED | KB/MB/GB conversion, case-insensitive, number passthrough |
| `packages/next/src/byos.ts` | BYOS presigned URL generation | VERIFIED | import 'server-only'; S3Client, PutObjectCommand, getSignedUrl; 900s default expiry |
| `packages/next/src/helpers.ts` | generateReactHelpers type stub | VERIFIED | Returns typed { UploadButton, UploadDropzone, UploadModal, useUploadKit } with keyof TRouter; throws at runtime (intentional Phase 4 design) |
| `packages/next/dist/index.js` | ESM build output | VERIFIED | File exists; byos-GW3SY5LB.mjs lazy chunk also present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/src/client.ts` | `packages/core/src/upload.ts` | client.upload() delegates to executeUpload() | WIRED | Line 49: `return executeUpload(this.#config, options)` |
| `packages/core/src/upload.ts` | `packages/core/src/single.ts` | file.size <= 10MB path | WIRED | Line 22: `return singleUpload(config, options)` |
| `packages/core/src/upload.ts` | `packages/core/src/multipart.ts` | file.size > 10MB path | WIRED | Line 20: `return multipartUpload(config, options)` |
| `packages/core/src/http.ts` | POST /api/v1/upload/request | fetchApi calls UploadKit API | WIRED | fetchApi used throughout single.ts, multipart.ts, client.ts with correct paths |
| `packages/next/src/handler.ts` | `packages/next/src/byos.ts` | storage config triggers BYOS presign path | WIRED | Lines 83-84: dynamic import('./byos') when config.storage present |
| `packages/next/src/handler.ts` | `packages/next/src/types.ts` | TRouter extends FileRouter generic | WIRED | Line 8: `createUploadKitHandler<TRouter extends FileRouter>` |
| `packages/next/src/helpers.ts` | `packages/next/src/types.ts` | generateReactHelpers<TRouter extends FileRouter> | WIRED | Line 16: `function generateReactHelpers<TRouter extends FileRouter>()` |

### Data-Flow Trace (Level 4)

These are SDK packages with no direct DB rendering — data flows through tested unit boundaries and API calls to external endpoints. No hollow prop pattern identified.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `client.ts listFiles` | ListFilesResult | fetchApi → GET /api/v1/files | Real API call with URLSearchParams | FLOWING |
| `single.ts upload` | UploadResult | XHR PUT + POST /api/v1/upload/complete | Real XHR + fetchApi chain | FLOWING |
| `multipart.ts upload` | etags array | XHR PUT per part, ETag from response header | Real XHR per part, ETag captured | FLOWING |
| `byos.ts generateByosPresignedUrl` | uploadUrl string | PutObjectCommand + getSignedUrl | Real AWS SDK call | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 37 tests pass | pnpm vitest run packages/core/tests/ packages/next/tests/ | 6 test files, 37 tests passed in 167ms | PASS |
| Core ESM + CJS dist exists | ls packages/core/dist/ | index.js, index.mjs, index.d.ts, index.d.mts | PASS |
| Next ESM + CJS dist exists | ls packages/next/dist/ | index.js, index.mjs, index.d.ts, index.d.mts, byos chunk | PASS |
| No banned imports in core | grep @aws-sdk/react/next packages/core/src/ | Only 'nextCursor' field name matched — no actual banned imports | PASS |
| core peerDependencies empty | node inspect package.json | peerDependencies: {} | PASS |
| next peerDependencies correct | node inspect package.json | peerDependencies: { "next": ">=14" } | PASS |
| sideEffects: false in both packages | node inspect package.json | sideEffects: false on both | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SDK-01 | 04-01-PLAN.md | createUploadKit factory with API key config (managed mode) | SATISFIED | createUploadKit in src/index.ts returns UploadKitClient; 6 client tests pass |
| SDK-02 | 04-01-PLAN.md | Programmatic upload with file, route, metadata, onProgress callback | SATISFIED | UploadOptions includes all fields; XHR onprogress wired in single.ts |
| SDK-03 | 04-01-PLAN.md | Multipart upload handling transparent to consumer | SATISFIED | executeUpload gateway auto-routes at 10MB; multipart.ts handles concurrent parts |
| SDK-04 | 04-01-PLAN.md | listFiles and deleteFile methods | SATISFIED | Both methods in client.ts with correct API paths; tests pass |
| SDK-05 | 04-02-PLAN.md | BYOS mode — identical SDK API, server-side presigned URL generation | SATISFIED | byos.ts generates presigned URLs; handler.ts routes to BYOS when config.storage present; import 'server-only' enforced |
| SDK-06 | 04-01-PLAN.md | Zero external dependencies, tree-shakeable ESM + CJS output via tsup | SATISFIED | peerDependencies: {}; sideEffects: false; @uploadkit/shared bundled into dist |
| NEXT-01 | 04-02-PLAN.md | createUploadKitHandler that produces GET/POST route handlers | SATISFIED | handler.ts returns { GET, POST } async functions; tests pass |
| NEXT-02 | 04-02-PLAN.md | File Router pattern with typed routes (allowedTypes, maxFileSize, maxFileCount, middleware, onUploadComplete) | SATISFIED | RouteConfig<TMiddleware> type has all 5 fields; parseFileSize handles string sizes |
| NEXT-03 | 04-02-PLAN.md | Middleware function receives request, returns metadata attached to upload | SATISFIED | middleware({ req }) called in both BYOS and upload-complete POST paths; result flows to onUploadComplete |
| NEXT-04 | 04-02-PLAN.md | End-to-end TypeScript inference from fileRouter definition to client components | SATISFIED | TRouter generic propagated through createUploadKitHandler; keyof TRouter used in generateReactHelpers return type; DTS confirms |
| NEXT-05 | 04-02-PLAN.md | BYOS configuration — same handler, developer's S3/R2 credentials via env vars | SATISFIED | S3CompatibleStorage interface in types.ts; UploadKitHandlerConfig.storage field; same handler routes both modes |

No orphaned requirements found — all 11 requirement IDs from plan frontmatter map cleanly to REQUIREMENTS.md entries under Phase 4.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/next/src/helpers.ts` | 29-33 | `throw new Error(...)` — runtime stub | INFO | Intentional design: the TYPE DEFINITION is the Phase 4 deliverable; Phase 5 replaces the throw with real implementations. The plan's must_haves.truths explicitly state this is a "stub implementation for Phase 5". Not a blocker. |

No other TODO/FIXME comments, placeholders, empty returns, or hardcoded empty data structures found in source files.

### Human Verification Required

None. All must-haves are verifiable programmatically through code inspection and test runs.

### Gaps Summary

No gaps identified. All 10 must-have truths are verified, all 15 required artifacts exist and are substantive, all 7 key links are wired, and all 37 unit tests pass. The `generateReactHelpers` runtime stub is intentional Phase 4 design — its value is the type signature, not the runtime, and this is explicitly documented in both the plan's must_haves and the SUMMARY.

---

_Verified: 2026-04-08T16:18:00Z_
_Verifier: Claude (gsd-verifier)_
