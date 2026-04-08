# Phase 3: Upload Flow & REST API - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

The complete presigned URL upload pipeline (request → direct R2 upload → confirm with R2 verification) plus all file/project/key/usage/logs REST API endpoints, with API key authentication, Zod validation, rate limiting, and async webhook delivery via Upstash QStash. This is the core backend that the SDK and dashboard consume.

</domain>

<decisions>
## Implementation Decisions

### API Structure
- **D-01:** Use Next.js App Router API routes (not Hono). Keep everything in `apps/api/src/app/api/v1/`. Already scaffolded.
- **D-02:** API key auth via `withApiKey(handler)` wrapper function — validates key, attaches project to context, returns 401 on failure. Every `/api/v1/*` route wraps with this.
- **D-03:** Next.js file-based routing — one file per endpoint: `apps/api/src/app/api/v1/upload/request/route.ts`, `apps/api/src/app/api/v1/files/route.ts`, etc.

### Upload Lifecycle
- **D-04:** Multipart threshold: 10MB. Chunk size: 5MB (R2 minimum part size). Files ≤10MB use single PUT, >10MB use multipart.
- **D-05:** Confirm step (complete-upload) performs three actions: (1) HEAD object in R2 to verify file exists, (2) store file metadata in MongoDB, (3) fire onUploadComplete webhook via QStash, (4) update usage records.
- **D-06:** Orphaned upload cleanup: cron job that queries File records with status=UPLOADING older than 1 hour, deletes from R2 + removes DB record. No R2 lifecycle rule — cron is the single cleanup mechanism.

### Error Responses
- **D-07:** Stripe-style error format: `{ error: { type: "invalid_request" | "authentication_error" | "rate_limit_error" | "api_error", code: "file_too_large", message: "Human readable...", suggestion: "Upgrade to Pro..." } }`. HTTP status codes: 400 (validation), 401 (auth), 403 (tier limit), 404 (not found), 429 (rate limit), 500 (server).
- **D-08:** Request validation with Zod schemas. Define schema per endpoint. Parse with `schema.safeParse()` — return Stripe-style error on failure with field-level details.

### Webhook Delivery
- **D-09:** onUploadComplete fires asynchronously via Upstash QStash. The confirm-upload endpoint enqueues the callback and returns immediately — the developer's response doesn't wait for the callback.
- **D-10:** Retry policy: 3 retries with exponential backoff (QStash built-in). After 3 failures, mark the webhook as failed in the upload log. Upload remains complete regardless.

### Claude's Discretion
- Zod schema design per endpoint (field names, validation rules)
- withApiKey implementation details (header extraction, key lookup, caching)
- Rate limiting wiring pattern (which limits on which endpoints)
- Multipart upload API design (initiate, upload-part, complete-multipart endpoints)
- Cron job implementation (Vercel Cron vs standalone script vs API route with auth)
- QStash integration specifics (signing, verification, URL configuration)
- Pagination strategy for list endpoints (cursor vs offset)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §2.1 — Upload flow diagram (request → presign → direct upload → confirm)
- `UPLOADKIT-GSD.md` §2.3 — All Mongoose model schemas (File, FileRouter, ApiKey, UsageRecord)
- `UPLOADKIT-GSD.md` §2.4 — Complete API endpoint list with HTTP methods

### Stack & Architecture Research
- `.planning/research/STACK.md` — Stripe Meters API for metered billing (Phase 7 depends on usage tracking from this phase)
- `.planning/research/ARCHITECTURE.md` — Component boundaries, presigned URL flow
- `.planning/research/PITFALLS.md` — R2 CORS AllowedHeaders, presigned URLs don't validate content (magic-byte check needed), orphaned objects

### Prior Phase Context
- `.planning/phases/01-monorepo-infrastructure/01-CONTEXT.md` — D-07 (separate R2 buckets), D-09 (R2 key path structure)
- `.planning/phases/02-authentication/02-CONTEXT.md` — D-08 (only /dashboard/* protected — API uses key auth)

### Existing Code
- `apps/api/src/lib/storage.ts` — R2 S3Client (already configured)
- `apps/api/src/lib/presign.ts` — generatePresignedPutUrl (already implements Content-Type + Content-Length lock)
- `apps/api/src/lib/rate-limit.ts` — Upstash ratelimit instances (configured, not yet wired)
- `packages/db/src/models/` — All 8 Mongoose models
- `packages/shared/src/` — Types, constants, error classes, utilities

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/lib/storage.ts` — R2 `S3Client` with env-based bucket selection
- `apps/api/src/lib/presign.ts` — `generatePresignedPutUrl()` with Content-Type + Content-Length locked
- `apps/api/src/lib/rate-limit.ts` — `ratelimit` (10/min) and `uploadRatelimit` (30/min) instances
- `packages/db/` — File, FileRouter, ApiKey, Project, UsageRecord models ready to use
- `packages/shared/src/errors.ts` — `UploadKitError` hierarchy for consistent error handling
- `packages/shared/src/constants.ts` — `FILE_STATUSES`, `TIERS`, `TIER_LIMITS`, `API_KEY_PREFIX`

### Established Patterns
- Mongoose models use `mongoose.models` hot-reload guard
- `connectDB()` cached connection pattern for serverless
- Single root `.env` for all secrets
- TypeScript strict, zero `any`

### Integration Points
- API routes in `apps/api/src/app/api/v1/` (new — to be created)
- Rate limiting from `apps/api/src/lib/rate-limit.ts` wires into `withApiKey` or per-route
- File model status lifecycle: UPLOADING → UPLOADED → DELETED
- UsageRecord model tracks monthly storage/bandwidth/uploads per user

</code_context>

<specifics>
## Specific Ideas

- The presign utility already locks Content-Type and Content-Length in the signature — this prevents type spoofing at the R2 level (security from Phase 1)
- INFRA-06 (rate limiting) was set up in Phase 1 but wiring to routes happens here — Phase 3 must fully close INFRA-06
- QStash requires a publicly accessible URL for webhook delivery — in dev, use QStash's test mode or a tunnel (ngrok/cloudflared)
- The cron job for orphaned uploads can be a Next.js API route at `/api/cron/cleanup` protected by a CRON_SECRET env var
- Usage tracking (UsageRecord) must use atomic `$inc` operations to prevent race conditions on concurrent uploads

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-upload-flow-rest-api*
*Context gathered: 2026-04-08*
