---
phase: 04-sdk-core-next-js-adapter
plan: "02"
subsystem: "@uploadkit/next"
tags: [sdk, typescript, next-js, file-router, byos, s3, presigned-url, middleware, esm, cjs]
dependency_graph:
  requires:
    - "@uploadkit/core (workspace:*) — UploadKitClient, UploadResult types"
    - "@uploadkit/shared (workspace:*) — UploadKitError"
    - "@aws-sdk/client-s3 — S3Client, PutObjectCommand for BYOS"
    - "@aws-sdk/s3-request-presigner — getSignedUrl for BYOS presigned URLs"
    - "nanoid — short unique IDs for BYOS storage keys"
    - "server-only — enforces server boundary (T-04-07)"
  provides:
    - "createUploadKitHandler factory — returns { GET, POST } App Router handlers"
    - "FileRouter type — typed file router pattern with satisfies constraint"
    - "RouteConfig<TMiddleware> — per-route config with middleware generic"
    - "S3CompatibleStorage — BYOS credentials config type"
    - "generateByosPresignedUrl — S3-compatible presigned PUT URL generation"
    - "generateReactHelpers<TRouter> — typed stub for Phase 5 consumption"
    - "parseFileSize — string ('4MB') to bytes conversion utility"
    - "ESM + CJS dual output with .d.ts declarations"
  affects:
    - "Phase 05 (@uploadkit/react) — imports generateReactHelpers type from @uploadkit/next"
tech_stack:
  added:
    - "@aws-sdk/client-s3 — S3Client, PutObjectCommand"
    - "@aws-sdk/s3-request-presigner — getSignedUrl"
    - "nanoid — URL-safe short IDs for storage key generation"
    - "server-only — Next.js server boundary enforcement package"
  patterns:
    - "FileRouter pattern: developer uses `satisfies FileRouter` to preserve literal route key types"
    - "Dynamic import of byos.ts in handler.ts — only loaded when storage config is present"
    - "import 'server-only' at module top — prevents accidental client bundle inclusion (T-04-07)"
    - "DOM lib in tsconfig — Request/Response/fetch are Web API globals needed for DTS build"
    - "Middleware return type flows as TMiddleware generic through RouteConfig into onUploadComplete"
    - "forcePathStyle: true on S3Client — required for MinIO and some S3-compatible providers"
key_files:
  created:
    - packages/next/src/types.ts
    - packages/next/src/router.ts
    - packages/next/src/handler.ts
    - packages/next/src/helpers.ts
    - packages/next/src/byos.ts
    - packages/next/tests/router.test.ts
    - packages/next/tests/handler.test.ts
    - packages/next/tests/byos.test.ts
  modified:
    - packages/next/src/index.ts
    - packages/next/package.json
    - packages/next/tsup.config.ts
    - packages/next/tsconfig.json
decisions:
  - "DOM lib added to packages/next/tsconfig.json — handler uses Request/Response Web API globals, same fix as @uploadkit/core (D-06 pattern)"
  - "byos.ts dynamically imported in handler.ts — avoids pulling AWS SDK into managed-mode handlers; only loaded when config.storage is present"
  - "generateReactHelpers type stub throws at runtime — the TYPE SIGNATURE is the deliverable for Phase 4; Phase 5 replaces the throw with real component factories"
  - "useUploadKit upload param typed as structural type (not File) — avoids requiring DOM lib in the return type signature of a library function"
  - "exports map types condition moved before import/require — correct TypeScript resolution order per spec"
metrics:
  duration: "~7 minutes"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 12
---

# Phase 04 Plan 02: @uploadkit/next SDK Summary

**One-liner:** Next.js App Router adapter with typed FileRouter pattern, middleware metadata flow, BYOS presigned URL generation via AWS SDK, and generateReactHelpers type stub for Phase 5.

## What Was Built

`@uploadkit/next` gives Next.js developers the UploadThing-style file router pattern with full TypeScript inference. Developers define a typed file router with `satisfies FileRouter`, pass it to `createUploadKitHandler`, and mount the returned `{ GET, POST }` handlers at `app/api/uploadkit/[...uploadkit]/route.ts`.

### Module Architecture

```
src/types.ts       — FileRouter, RouteConfig<TMiddleware>, S3CompatibleStorage, UploadedFile
src/router.ts      — parseFileSize() converter, getRouteConfig() lookup
src/handler.ts     — createUploadKitHandler() factory (import 'server-only')
src/byos.ts        — createByosClient(), generateByosPresignedUrl() (import 'server-only')
src/helpers.ts     — generateReactHelpers<TRouter>() typed stub
src/index.ts       — clean named re-exports, no default exports
```

### Key Behaviors

**createUploadKitHandler:**
- Returns `{ GET, POST }` compatible with Next.js 16 App Router (params is a Promise)
- GET: returns route config JSON (maxFileSize in bytes, allowedTypes) for client-side UX validation
- GET: returns 404 with `ROUTE_NOT_FOUND` error code for unknown slugs
- POST `action: 'upload-complete'`: runs middleware → calls onUploadComplete with metadata result
- POST `action: 'request-upload'` + storage config: BYOS presign path (middleware → validate → generate key → presigned URL)
- Wraps all handlers in try/catch returning `HANDLER_ERROR` on unexpected exceptions

**FileRouter pattern:**
```typescript
const fileRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    allowedTypes: ['image/jpeg', 'image/png'],
    middleware: async ({ req }) => {
      const session = await getSession(req);
      return { userId: session.user.id }; // TMiddleware inferred here
    },
    onUploadComplete: async ({ file, metadata }) => {
      // metadata.userId is typed — flows from middleware return type
      await db.createFile({ ...file, userId: metadata.userId });
    },
  },
} satisfies FileRouter;
```

**BYOS mode:**
- `createByosClient(storage)` — S3Client with developer credentials, forcePathStyle, optional R2 endpoint
- `generateByosPresignedUrl(client, params)` — PutObjectCommand with ContentType + ContentLength locked in signature (T-04-11), 15min default expiry
- Key format: `${slug}/${nanoid()}/${fileName}` — prevents collision and scope leakage

**generateReactHelpers:**
- Returns typed `{ UploadButton, UploadDropzone, UploadModal, useUploadKit }` where `route` prop is `keyof TRouter & string`
- Throws at runtime with install hint — Phase 5 replaces with real implementations

### Build Output

```
dist/index.mjs         — ESM (4.63 KB)
dist/byos-GW3SY5LB.mjs — BYOS chunk (839 B, lazy loaded)
dist/index.js          — CJS (7.70 KB)
dist/index.d.ts        — Type declarations (3.68 KB)
dist/index.d.mts       — ESM type declarations
```

`sideEffects: false`. `@aws-sdk` externalized (not bundled) — consumers provide their own version.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DOM lib missing from tsconfig**
- **Found during:** Task 2 build (DTS build step)
- **Issue:** Library tsconfig uses `"lib": ["ES2022"]`. `Request`, `Response`, `File` are DOM globals used in `types.ts` and `handler.ts`. Same issue as Plan 01.
- **Fix:** Added `"lib": ["ES2022", "DOM"]` override in `packages/next/tsconfig.json`
- **Files modified:** `packages/next/tsconfig.json`
- **Commit:** c9ca5e9

**2. [Rule 3 - Blocking] package.json exports condition order**
- **Found during:** Task 2 build (tsup warning)
- **Issue:** `types` condition after `import`/`require` — TypeScript resolution ignores it
- **Fix:** Moved `types` before `import` and `require` in exports map
- **Files modified:** `packages/next/package.json`
- **Commit:** c9ca5e9

**3. [Rule 1 - Bug] helpers.ts used `File` (DOM global) in return type signature**
- **Found during:** Task 2 build (DTS error `Cannot find name 'File'`)
- **Issue:** `useUploadKit.upload: (file: File) => Promise<void>` requires DOM lib in the DTS build for the helpers type. Even with DOM lib added to tsconfig, this was flagged before that fix was applied.
- **Fix:** Changed to structural type `{ name: string; size: number; type: string }` — compatible with `File` but does not require DOM in type position. Phase 5 will use the real `File` type via React component props.
- **Files modified:** `packages/next/src/helpers.ts`
- **Commit:** c9ca5e9

**4. [Rule 1 - Bug] S3Client mock was an arrow function (not a constructor)**
- **Found during:** Task 2 test run (byos.test.ts)
- **Issue:** `vi.mock` used `() => ({ _config: config })` — arrow functions cannot be used with `new`. Vitest warned and tests threw `is not a constructor`.
- **Fix:** Changed S3Client mock to use `vi.fn(function(this, config) { this._config = config })` — regular function works with `new`.
- **Files modified:** `packages/next/tests/byos.test.ts`
- **Commit:** c9ca5e9 (fix applied in same commit before final push)

## Security Mitigations Applied

All threat model items verified:

| Threat ID | Mitigation |
|-----------|------------|
| T-04-07 | `import 'server-only'` in both `handler.ts` and `byos.ts`; BYOS credentials never serialized to response |
| T-04-08 | `middleware` runs before `onUploadComplete` in all POST paths — developer authenticates in middleware |
| T-04-09 | File size validated against `parseFileSize(route.maxFileSize)` before BYOS presign; type checked against `allowedTypes` |
| T-04-10 | GET returns config intentionally public (maxFileSize, allowedTypes) — no credentials or secrets |
| T-04-11 | Presigned URL scoped to specific key, ContentType, ContentLength; `expiresIn: 900` (15 minutes) |
| T-04-12 | Rate limiting deferred to developer's infrastructure — documented in threat model as `accept` |

## Test Results

```
Test Files  3 passed (3)
     Tests  20 passed (20)
```

- `router.test.ts` — 7 tests: parseFileSize KB/MB/GB, number passthrough, case-insensitive
- `handler.test.ts` — 6 tests: GET config, GET 404, POST middleware flow, POST 404, no-middleware default
- `byos.test.ts` — 7 tests: S3Client config, endpoint present/absent, getSignedUrl args, expiresIn defaults, handler BYOS integration

Full Phase 4: 37 tests across 6 files, all green.

## Known Stubs

**generateReactHelpers** (`packages/next/src/helpers.ts`):
- Runtime: throws `Error('generateReactHelpers requires @uploadkit/react...')`
- This is intentional — the value of this stub is the TYPE DEFINITION, not the runtime behavior
- Phase 5 (`@uploadkit/react`) replaces the throw with real UploadButton, UploadDropzone, UploadModal, useUploadKit implementations
- The stub does NOT prevent the plan's goal from being achieved — it is the designed Phase 4 deliverable per the plan's `must_haves.truths`

## Threat Flags

None — no new network surface beyond the plan's threat model.

## Self-Check

Verified files exist:
- `packages/next/src/types.ts` — FOUND
- `packages/next/src/router.ts` — FOUND
- `packages/next/src/handler.ts` — FOUND
- `packages/next/src/helpers.ts` — FOUND
- `packages/next/src/byos.ts` — FOUND
- `packages/next/dist/index.mjs` — FOUND
- `packages/next/dist/index.js` — FOUND
- `packages/next/dist/index.d.ts` — FOUND

Commits verified:
- `0bdf32b` — feat(04-02): FileRouter types, handler factory, middleware, and route config
- `c9ca5e9` — feat(04-02): BYOS presigned URL generation and build verification

## Self-Check: PASSED
