---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 04-sdk-core-next-js-adapter 04-02-PLAN.md
last_updated: "2026-04-08T16:38:14.962Z"
last_activity: 2026-04-08
progress:
  total_phases: 10
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** Developers can add beautiful, type-safe file uploads to any app in minutes — with a generous free tier, no vendor lock-in (BYOS), and premium components out of the box.
**Current focus:** Phase 04 — sdk-core-next-js-adapter

## Current Position

Phase: 5
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-08

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 03 | 4 | - | - |
| 04 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: —

*Updated after each plan completion*
| Phase 01-monorepo-infrastructure P01 | 4m | 2 tasks | 50 files |
| Phase 01-monorepo-infrastructure P02 | 5m | 2 tasks | 25 files |
| Phase 01-monorepo-infrastructure P03 | 8m | 2 tasks | 9 files |
| Phase 01-monorepo-infrastructure P04 | 2m | 2 tasks | 10 files |
| Phase 02-authentication P01 | 7m | 3 tasks | 20 files |
| Phase 02-authentication P02 | 2m | 2 tasks | 4 files |
| Phase 03-upload-flow-rest-api P01 | 15m | 3 tasks | 13 files |
| Phase 03-upload-flow-rest-api P02 | 3m | 2 tasks | 5 files |
| Phase 03-upload-flow-rest-api P03 | 4m | 2 tasks | 10 files |
| Phase 03-upload-flow-rest-api P04 | 3m | 2 tasks | 6 files |
| Phase 04-sdk-core-next-js-adapter P01 | 20m | 3 tasks | 13 files |
| Phase 04-sdk-core-next-js-adapter P02 | 7m | 2 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Upload logs use polling (5s GET /api/v1/logs?since=timestamp), not SSE/WebSocket
- Roadmap: BYOS always server-side — S3/R2 credentials never touch the browser
- Roadmap: Stripe Meters API (not legacy UsageRecord) for metered overage billing
- Roadmap: R2 CORS must be configured in Phase 1 before any upload code in Phase 3
- Roadmap: MongoDB cached connection lives in packages/db (INFRA-03) — foundation for all API routes
- Roadmap: No server-side image processing in v1; client-side canvas thumbnails in @uploadkit/react
- [Phase 01-monorepo-infrastructure]: tailwindcss is a direct dep of packages/config so @import tailwindcss resolves when apps consume base.css via workspace protocol
- [Phase 01-monorepo-infrastructure]: ignoreDeprecations 6.0 in tsconfig.base.json for TypeScript 6 compatibility with tsup DTS build (baseUrl deprecation)
- [Phase 01-monorepo-infrastructure]: Use globalThis._mongooseCache (not global.mongoose) to avoid TypeScript namespace collision with mongoose import
- [Phase 01-monorepo-infrastructure]: packages/db tsconfig adds types:[node] override to resolve global/process in connection.ts DTS build
- [Phase 01-monorepo-infrastructure]: ContentType and ContentLength locked in presigned URL signature to prevent type spoofing (T-01-08)
- [Phase 01-monorepo-infrastructure]: Rate limiter instances (sliding window) configured in Phase 1; wiring into route handlers deferred to Phase 3
- [Phase 01-monorepo-infrastructure]: Sentry helper gated on SENTRY_DSN env var — full instrumentation via wizard when DSN is available
- [Phase 01-monorepo-infrastructure]: Dockerfiles copy only package.json manifests in deps stage to maximize Docker layer cache before full source COPY
- [Phase 01-monorepo-infrastructure]: Changeset ignore list includes all 8 private packages; only @uploadkit/core, @uploadkit/react, @uploadkit/next are publishable to npm
- [Phase 02-authentication]: Auth.js v5 async lazy factory: NextAuth(async () => config) ensures connectDB() runs before adapter on every cold start
- [Phase 02-authentication]: packages/db and packages/shared package.json exports corrected from index.cjs to index.js to match actual tsup CJS output filename
- [Phase 02-authentication]: declaration: false in dashboard tsconfig.json — Next.js apps don't need .d.ts emit; avoids non-portable AppRouteHandlerFn type error from next-auth internals
- [Phase 02-authentication]: export const dynamic='force-dynamic' required on all auth-gated pages — Next.js static prerendering fails when MONGODB_URI/AUTH_SECRET absent at build time
- [Phase 02-authentication]: Server actions used for signIn/signOut — CSRF-safe by Next.js design (T-02-11)
- [Phase 03-upload-flow-rest-api]: ApiKey model stores keyHash (SHA256 hex) + keyPrefix — plaintext key never persisted (T-03-01)
- [Phase 03-upload-flow-rest-api]: Rate limit runs before DB lookup in withApiKey using Upstash HTTP to minimize latency on rejected requests (T-03-05)
- [Phase 03-upload-flow-rest-api]: QStash client null-guarded on QSTASH_TOKEN — enqueueWebhook is a no-op in dev (D-09/D-10)
- [Phase 03-upload-flow-rest-api]: effectiveMaxSize = Math.min(fileRouter.maxFileSize, TIER_LIMITS[tier].maxFileSizeBytes) enforces the more restrictive of route-level and tier-level file size limits
- [Phase 03-upload-flow-rest-api]: R2 HEAD catches both 403 and 404 from S3ServiceException..statusCode — R2 returns 403 for missing objects when bucket has restricted GetObject policy (Pitfall 4)
- [Phase 03-upload-flow-rest-api]: Optional metadata uses conditional spread ...(metadata !== undefined ? { metadata } : {}) to satisfy exactOptionalPropertyTypes: true throughout upload routes
- [Phase 03-upload-flow-rest-api]: mongoose added as direct dep to apps/api for Types.ObjectId in cursor pagination and route-level ObjectId validation
- [Phase 03-upload-flow-rest-api]: API key full plaintext returned only at POST creation, SHA256 hash stored in DB — implements T-03-15 info disclosure mitigation
- [Phase 03-upload-flow-rest-api]: File DELETE: R2 hard delete then MongoDB soft-delete with atomic negative $inc on storageUsed prevents double-decrement on retry (T-03-16)
- [Phase 03-upload-flow-rest-api]: Cleanup accepts both x-cron-secret header and Authorization: Bearer for Vercel Cron compatibility
- [Phase 03-upload-flow-rest-api]: QStash DLQ only sets webhookFailedAt timestamp — no destructive action; signing key check skipped in dev with console.warn
- [Phase 04-sdk-core-next-js-adapter]: DOM lib added to packages/core/tsconfig.json — core uses browser globals (File, AbortSignal, XHR) so ES2022 alone is insufficient
- [Phase 04-sdk-core-next-js-adapter]: @uploadkit/shared bundled into dist (not in tsup external[]) — gives SDK consumers zero transitive runtime deps
- [Phase 04-sdk-core-next-js-adapter]: UploadKitClient stores apiKey in private class field (#apiKey) to prevent key enumeration (T-04-05)
- [Phase 04-sdk-core-next-js-adapter]: DOM lib added to packages/next/tsconfig.json — handler uses Request/Response Web API globals
- [Phase 04-sdk-core-next-js-adapter]: byos.ts dynamically imported in handler.ts — only loaded when config.storage is present, avoids AWS SDK in managed-mode bundles
- [Phase 04-sdk-core-next-js-adapter]: generateReactHelpers type stub throws at runtime — TYPE SIGNATURE is Phase 4 deliverable; Phase 5 replaces throw with real component factories

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-08T14:17:31.108Z
Stopped at: Completed 04-sdk-core-next-js-adapter 04-02-PLAN.md
Resume file: None
