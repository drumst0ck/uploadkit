---
phase: quick-260409-t9f
plan: 01
subsystem: api/rate-limiting
tags: [rate-limiting, ioredis, redis, infrastructure, dependency-swap]
dependency_graph:
  requires: []
  provides: [ioredis-rate-limiter, in-memory-fallback]
  affects: [apps/api/src/lib/rate-limit.ts, apps/api/src/lib/with-api-key.ts]
tech_stack:
  added: [ioredis, rate-limiter-flexible]
  removed: [@upstash/ratelimit, @upstash/redis]
  patterns: [in-memory fallback when REDIS_URL unset, lazyConnect for test safety]
key_files:
  created: []
  modified:
    - apps/api/src/lib/rate-limit.ts
    - apps/api/__tests__/setup.ts
    - apps/api/package.json
    - .env.example
decisions:
  - ioredis with lazyConnect:true avoids TCP connections at import time in test environments
  - RateLimiterMemory fallback activates when REDIS_URL is empty/unset — CI-safe with no external dependency
  - { success, reset } interface preserved exactly — with-api-key.ts required zero changes
  - @upstash/qstash retained; only @upstash/ratelimit and @upstash/redis removed
metrics:
  duration: ~5m
  completed: 2026-04-09T19:08:23Z
  tasks_completed: 2
  files_modified: 4
---

# Phase quick-260409-t9f Plan 01: Replace Upstash with Native Redis Summary

**One-liner:** Replaced @upstash/ratelimit + @upstash/redis with ioredis + rate-limiter-flexible, preserving the `{ success, reset }` interface and adding in-memory fallback for CI.

## What Was Built

Rate limiting in the API app now uses native TCP Redis via ioredis + rate-limiter-flexible instead of the HTTP-based Upstash Redis SDK. The replacement:

- Connects to the self-hosted `redis:7-alpine` container already in docker-compose.yml via `REDIS_URL`
- Falls back to `RateLimiterMemory` when `REDIS_URL` is absent or empty — no real Redis needed in dev/CI
- Uses `lazyConnect: true` so ioredis does not attempt TCP connection on module import
- Exports `ratelimit` and `uploadRatelimit` with identical `.limit(key): Promise<{ success, reset }>` interface

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Swap deps and rewrite rate-limit.ts | 2843dc9 | apps/api/src/lib/rate-limit.ts, apps/api/__tests__/setup.ts, apps/api/package.json, pnpm-lock.yaml |
| 2 | Update .env.example and verify build | c4ea63c | .env.example |

## Verification

- `grep -r '@upstash/redis\|@upstash/ratelimit' apps/api/src/` → only a comment, no imports
- `apps/api/package.json` contains `ioredis` and `rate-limiter-flexible`; no `@upstash/ratelimit` or `@upstash/redis`
- `@upstash/qstash` remains in `apps/api/package.json` (untouched)
- `apps/api/__tests__/setup.ts` has `REDIS_URL = ''`; no `UPSTASH_REDIS_REST_URL`
- `.env.example` has `REDIS_URL=redis://localhost:6379`; no `UPSTASH_REDIS_REST_URL`
- `pnpm turbo build --filter=@uploadkitdev/api` exits 0 (4 tasks, 2 cached)
- `pnpm --filter @uploadkitdev/api typecheck` exits 0
- 51/52 API tests pass — the 1 failing test (`projects.test.ts > creates project with auto-generated slug`) is pre-existing and unrelated to rate limiting

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

## Pre-existing Test Failure (Out of Scope)

`__tests__/projects.test.ts > POST /api/v1/projects > creates project with auto-generated slug` returns 500 instead of 201. Confirmed pre-existing: same failure on the commit before Task 1 changes. Root cause is unrelated to rate limiting (likely a MongoDB mock issue in that test). Logged as out-of-scope per deviation scope boundary rules.

## Self-Check: PASSED

- `/Users/drumstock/Developer/GitHub/uploadkit/apps/api/src/lib/rate-limit.ts` exists ✓
- `/Users/drumstock/Developer/GitHub/uploadkit/apps/api/__tests__/setup.ts` exists ✓
- `/Users/drumstock/Developer/GitHub/uploadkit/.env.example` exists ✓
- Commit 2843dc9 exists ✓
- Commit c4ea63c exists ✓
