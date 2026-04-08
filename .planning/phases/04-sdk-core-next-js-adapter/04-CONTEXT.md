# Phase 4: SDK Core & Next.js Adapter - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

`@uploadkit/core` (zero-dependency upload client for both managed and BYOS modes) and `@uploadkit/next` (createUploadKitHandler with file router pattern and end-to-end TypeScript inference). These are the npm packages developers install to integrate UploadKit.

</domain>

<decisions>
## Implementation Decisions

### Core SDK API
- **D-01:** `createUploadKit({ apiKey: 'uk_live_xxx', baseUrl?: 'https://api.uploadkit.dev' })` — minimal factory config. Only API key and optional base URL.
- **D-02:** Single `upload()` method: `uploadkit.upload({ file, route, metadata?, onProgress? })` — handles single-file and multipart transparently based on file size (>10MB = multipart). No separate `uploadMultipart()` method.
- **D-03:** Client-side upload progress via XMLHttpRequest (not fetch). XHR's `upload.onprogress` provides native progress events. The SDK wraps this to fire `onProgress(percentage: number)` callbacks.
- **D-04:** Retry with exponential backoff built into the core SDK. Configurable: `maxRetries` (default 3), retries on 5xx/429 only (per Phase 3 server contract). Uses `AbortController` for cancellation.

### BYOS Configuration
- **D-05:** BYOS is configured at the handler level only (`@uploadkit/next`'s `createUploadKitHandler`), NOT at the factory level. The `@uploadkit/core` client doesn't know about BYOS — it just talks to presigned URLs.
- **D-06:** BYOS supports S3-compatible providers only (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces). Single `S3CompatibleStorage` interface with `endpoint`, `region`, `accessKeyId`, `secretAccessKey`, `bucket`.

### Type Inference
- **D-07:** Export `AppFileRouter` type from route.ts. Client uses `generateReactHelpers<AppFileRouter>()` for typed components. Same pattern as UploadThing.
- **D-08:** Type inference includes route names AND per-route config (maxFileSize, allowedTypes, maxFileCount). Client components get full autocomplete and type errors on invalid route usage.

### Package Output
- **D-09:** ESM + CJS dual output via tsup (already scaffolded in Phase 1). `sideEffects: false` for tree-shaking.
- **D-10:** React and Next.js declared as `peerDependencies`. `@uploadkit/core` has `react` in its peerDeps for `@uploadkit/react` (not for core itself — core is framework-agnostic). `@uploadkit/next` has `next` as peerDep.

### Claude's Discretion
- Internal upload state machine design
- XHR wrapper implementation details
- Multipart chunking algorithm
- TypeScript generics architecture for fileRouter inference
- @uploadkit/core internal module structure
- Error handling and error types exported from core
- BYOS S3Client initialization pattern within the handler

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §3.1 — @uploadkit/core public API (createUploadKit, upload, listFiles, deleteFile)
- `UPLOADKIT-GSD.md` §3.2 — @uploadkit/react component exports and design (Phase 5, but informs core hook design)
- `UPLOADKIT-GSD.md` §3.3 — @uploadkit/next handler, fileRouter pattern, generateReactHelpers

### Stack Research
- `.planning/research/STACK.md` — tsup 8.5.0 for SDK publishing, TypeScript 6 compatibility
- `.planning/research/ARCHITECTURE.md` — SDK three-tier layering: core → react + next

### Prior Phase Context
- `.planning/phases/03-upload-flow-rest-api/03-CONTEXT.md` — D-04 (multipart 10MB/5MB), D-07 (Stripe-style errors), D-09 (QStash async webhooks)

### Existing Code
- `packages/core/src/index.ts` — Empty stub from Phase 1
- `packages/next/src/index.ts` — Empty stub from Phase 1
- `packages/core/tsup.config.ts` — Build config (already ESM + CJS)
- `packages/next/tsup.config.ts` — Build config
- `apps/api/src/app/api/v1/upload/` — Upload endpoints the SDK calls
- `apps/api/src/lib/schemas.ts` — Zod schemas defining the API contract
- `packages/shared/src/types.ts` — Shared types (UploadFile, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/shared/src/types.ts` — Types like `UploadFile`, `ApiKeyData`, `ProjectData`
- `packages/shared/src/constants.ts` — `TIER_LIMITS`, `API_KEY_PREFIX`
- `packages/shared/src/errors.ts` — `UploadKitError` class hierarchy
- `apps/api/src/lib/schemas.ts` — Zod schemas define the exact API contract the SDK must follow
- `apps/api/src/lib/presign.ts` — Presigned URL logic (reference for what the SDK consumes)

### Established Patterns
- tsup builds configured in Phase 1 (ESM + CJS, sideEffects: false)
- Package exports declared in package.json with `exports` field
- `@uploadkit/shared` consumed via workspace protocol

### Integration Points
- `@uploadkit/core` calls `POST /api/v1/upload/request`, `POST /api/v1/upload/complete`, multipart endpoints
- `@uploadkit/next` creates route handlers that call the same presign/storage code as `apps/api`
- `@uploadkit/next` BYOS mode generates presigned URLs using developer's credentials instead of UploadKit's

</code_context>

<specifics>
## Specific Ideas

- The XHR-based upload should handle CORS correctly — R2 presigned PUT URLs require explicit Content-Type header matching the presigned value
- For multipart, the core SDK should upload chunks concurrently (3-5 concurrent) for performance, not sequentially
- The `generateReactHelpers<AppFileRouter>()` pattern returns pre-typed components — this is what makes `<UploadButton route="imageUploader" />` type-safe
- `@uploadkit/core` must be truly zero-dependency — no `@aws-sdk/*` (that's in `@uploadkit/next` for BYOS). Core only does HTTP calls to the API
- `@uploadkit/next` depends on `@uploadkit/core` as a regular dependency (not peer)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-sdk-core-next-js-adapter*
*Context gathered: 2026-04-08*
