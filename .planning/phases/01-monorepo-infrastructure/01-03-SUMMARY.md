---
phase: 01-monorepo-infrastructure
plan: 03
subsystem: storage-infrastructure
tags: [r2, presigned-url, rate-limiting, sentry, seed-script, cloudflare]
dependency_graph:
  requires: [01-02]
  provides: [r2-client, presigned-url-utility, rate-limiter-instances, sentry-helper, seed-script]
  affects: [apps/api, scripts]
tech_stack:
  added: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "@upstash/ratelimit", "@upstash/redis", "@sentry/nextjs", "zod", "tsx"]
  patterns: ["env-based bucket selection", "sliding window rate limiting", "presigned PUT URL with content locking", "database seed script"]
key_files:
  created:
    - apps/api/src/lib/storage.ts
    - apps/api/src/lib/presign.ts
    - apps/api/src/lib/rate-limit.ts
    - apps/api/src/lib/sentry.ts
    - scripts/seed.ts
    - scripts/verify-r2.ts
  modified:
    - apps/api/package.json
    - apps/dashboard/package.json
    - package.json
decisions:
  - "ContentType and ContentLength locked in presigned URL signature to prevent type spoofing (T-01-08)"
  - "Rate limiter instances configured with sliding window here; route wiring deferred to Phase 3"
  - "Sentry helper gated on SENTRY_DSN env var — full instrumentation via wizard when DSN is available"
  - "CDN URL resolves to cdn.uploadkit.dev in production, R2 direct URL in dev (D-08)"
  - "error: unknown used in verify-r2.ts instead of error: any per TypeScript strict zero-any constraint"
metrics:
  duration: ~8m
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 6
  files_modified: 3
---

# Phase 01 Plan 03: Storage Infrastructure and Seed Scripts Summary

**One-liner:** Cloudflare R2 S3Client with env-based bucket selection, presigned PUT URL generator with ContentType+ContentLength signature locking, Upstash sliding-window rate limiter instances, Sentry DSN-gated helper, and seed script creating complete test dataset (user/project/API key/file router/files/subscription/usage record).

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | R2 storage client, presigned URL utility, Upstash rate limiter, Sentry setup | c936287 | storage.ts, presign.ts, rate-limit.ts, sentry.ts, apps/api/package.json, apps/dashboard/package.json |
| 2 | Seed script and R2 verification script | ee7d2c8 | scripts/seed.ts, scripts/verify-r2.ts, package.json |

## What Was Built

### R2 Storage Client (`apps/api/src/lib/storage.ts`)
- `r2Client`: S3Client configured for Cloudflare R2 with `https://{ACCOUNT_ID}.r2.cloudflarestorage.com` endpoint
- `R2_BUCKET`: env-based bucket selection — `R2_BUCKET_NAME` env var, or `uploadkit-prod` in production and `uploadkit-dev` in development (D-07)
- `CDN_URL`: `https://cdn.uploadkit.dev` in production, R2 direct URL in development (D-08)

### Presigned URL Utility (`apps/api/src/lib/presign.ts`)
- `generatePresignedPutUrl`: generates presigned PUT URLs with `ContentType` and `ContentLength` locked in signature
- Default expiry of 900 seconds (15 minutes) per plan spec
- Prevents type spoofing — mismatched Content-Type at upload time returns 403 from R2 (T-01-08)

### Rate Limiter (`apps/api/src/lib/rate-limit.ts`)
- `ratelimit`: 10 requests/minute sliding window, keyed by API key ID, prefix `uploadkit:ratelimit`
- `uploadRatelimit`: 30 requests/minute sliding window, prefix `uploadkit:upload-ratelimit`
- Instances are configured here; wiring into route handlers is deferred to Phase 3 (T-01-10)

### Sentry Helper (`apps/api/src/lib/sentry.ts`)
- `initSentry()`: initializes Sentry only when `SENTRY_DSN` is present in env
- `tracesSampleRate`: 0.1 in production, 1.0 in development
- Full instrumentation files created via `npx @sentry/wizard -i nextjs` when DSN is available

### Seed Script (`scripts/seed.ts`)
- Runnable as `pnpm seed` — creates complete test data:
  - Test user: `test@uploadkit.dev`
  - Test project: slug `test-project`
  - Test API key: `uk_test_seed_key_abc123def456` (isTest: true)
  - File router: slug `imageUploader`, allows JPEG/PNG/WebP up to 4MB
  - 2 sample files with status `UPLOADED`
  - Subscription: tier `FREE`, status `ACTIVE`
  - UsageRecord for current period

### R2 Verification Script (`scripts/verify-r2.ts`)
- `pnpm verify-r2` — verifies R2 bucket connectivity via `HeadBucketCommand`
- Prints correct CORS config with explicit `AllowedHeaders: ['Content-Type', 'Content-Length']` (not wildcard)
- Prints lifecycle rule and CDN domain manual step reminders per `user_setup` in the plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `error: any` with typed error handling in verify-r2.ts**
- **Found during:** Task 2
- **Issue:** Plan template used `error: any` but project enforces TypeScript strict mode with zero `any`
- **Fix:** Changed `catch (error: any)` to `catch (error: unknown)` and narrowed type with `const err = error as { name?: string; message?: string }`
- **Files modified:** scripts/verify-r2.ts
- **Commit:** ee7d2c8

## Known Stubs

None — all files provide complete, non-placeholder implementations.

## Threat Surface Scan

All security-relevant surfaces are covered by the plan's threat model:
- T-01-08: ContentType+ContentLength locked in presigned URL signature — implemented
- T-01-09: 15-minute expiry + projectId-scoped keys — implemented
- T-01-10: Sliding window rate limiters configured — implemented (wired in Phase 3)
- T-01-11: R2 credentials from env only, CDN URL separate from S3 endpoint — implemented
- T-01-12: Seed uses test keys only, never real credentials — implemented

No new threat surfaces introduced beyond the plan.

## User Setup Required (Manual Cloud Console Steps)

Two steps documented in the plan's `user_setup` section cannot be automated and must be completed manually:

1. **R2 Lifecycle Rule** — Cloudflare Dashboard > R2 > uploadkit-prod > Lifecycle rules
   - Add rule `expire-failed-uploads`: delete objects older than 1 day (orphaned UPLOADING status files)

2. **CDN Domain** — Cloudflare Dashboard > R2 > uploadkit-prod > Settings > Custom Domains
   - Connect domain: `cdn.uploadkit.dev`
   - Cloudflare auto-creates the CNAME; SSL provisioning takes < 5 minutes
   - Verify with `https://cdn.uploadkit.dev` (expect 403, not DNS error)

Run `pnpm verify-r2` after configuring R2 credentials to verify bucket connectivity and see these reminders printed.

## Self-Check: PASSED

Files verified:
- apps/api/src/lib/storage.ts: FOUND — contains `r2.cloudflarestorage.com`, `R2_BUCKET`, `cdn.uploadkit.dev`
- apps/api/src/lib/presign.ts: FOUND — contains `getSignedUrl`, `ContentType`, `ContentLength`, `expiresIn ?? 900`
- apps/api/src/lib/rate-limit.ts: FOUND — contains `slidingWindow`, `uploadkit:ratelimit`
- apps/api/src/lib/sentry.ts: FOUND
- scripts/seed.ts: FOUND — contains `connectDB`, `User.create`, `uk_test_seed_key`, `FileRouter.create`
- scripts/verify-r2.ts: FOUND — contains `HeadBucketCommand`, lifecycle reminder, CORS config

Commits verified:
- c936287: FOUND
- ee7d2c8: FOUND
