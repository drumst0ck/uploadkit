---
phase: 01-monorepo-infrastructure
plan: 02
subsystem: data-layer
tags: [mongoose, mongodb, shared-types, constants, errors, utilities, tdd]
dependency_graph:
  requires: [01-01]
  provides: [packages/shared, packages/db]
  affects: [all-apps, all-sdk-packages]
tech_stack:
  added: [nanoid@5.1.7, mongoose@9.4.1, @types/node]
  patterns: [globalThis-mongoose-cache, mongoose.models-guard, tsup-dual-esm-cjs, vitest-unit]
key_files:
  created:
    - packages/shared/src/types.ts
    - packages/shared/src/constants.ts
    - packages/shared/src/errors.ts
    - packages/shared/src/utils.ts
    - packages/shared/src/index.ts
    - packages/shared/tests/utils.test.ts
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/tsup.config.ts
    - packages/shared/vitest.config.ts
    - packages/db/src/connection.ts
    - packages/db/src/models/user.ts
    - packages/db/src/models/account.ts
    - packages/db/src/models/project.ts
    - packages/db/src/models/api-key.ts
    - packages/db/src/models/file.ts
    - packages/db/src/models/file-router.ts
    - packages/db/src/models/subscription.ts
    - packages/db/src/models/usage-record.ts
    - packages/db/src/index.ts
    - packages/db/tests/connection.test.ts
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/tsup.config.ts
    - packages/db/vitest.config.ts
  modified: []
decisions:
  - "Use globalThis._mongooseCache (not global.mongoose) to avoid TypeScript namespace collision with mongoose import"
  - "exactOptionalPropertyTypes requires conditional assignment for optional class properties"
  - "packages/db tsconfig adds types:[node] override to resolve global/process in connection.ts"
  - "exports field in package.json places types condition first for correct TypeScript module resolution"
metrics:
  duration: 5m
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 25
  files_modified: 0
---

# Phase 01 Plan 02: Shared Types + DB Models Summary

**One-liner:** TypeScript shared package (types, constants, errors, nanoid utils) and Mongoose db package (8 models + globalThis-cached connectDB) — the data layer foundation for all apps and SDK packages.

## What Was Built

### packages/shared

A zero-runtime-dependency (except nanoid) package providing the cross-boundary contract for the entire monorepo:

- **types.ts** — `UploadFile`, `Project`, `ApiKeyData`, `FileRouterConfig`, `SubscriptionData`, `UsageRecordData` interfaces; `Tier`, `FileStatus`, `SubscriptionStatus` type aliases
- **constants.ts** — `TIERS` (readonly tuple), `FILE_STATUSES` (readonly tuple), `TIER_LIMITS` (per-tier storage/bandwidth/filesize/upload/project/key limits satisfying a typed record), `API_KEY_PREFIX` (`uk_live_` / `uk_test_`)
- **errors.ts** — `UploadKitError` base class with `code`, `statusCode`, `suggestion`; subclasses: `NotFoundError`, `UnauthorizedError`, `RateLimitError`, `TierLimitError`
- **utils.ts** — `formatBytes` (human-readable sizes), `generateId` (nanoid wrapper, default length 21), `slugify` (lowercase, hyphenated, special-char stripped)

Builds dual ESM+CJS with `.d.ts` declarations. 15 unit tests covering all behaviors from the plan spec.

### packages/db

A Node.js-only package (never run in Edge Runtime) providing MongoDB access:

- **connection.ts** — `connectDB()` using `globalThis._mongooseCache` pattern: stores `{ conn, promise }` on the global object so repeated calls within a serverless warm instance return the cached connection without re-connecting. `maxPoolSize: 10` in production, `1` in development. `serverSelectionTimeoutMS: 5000`.
- **8 Mongoose models** with correct schemas, indexes, and guards:
  - `User` — email unique index, timestamps
  - `Account` — compound unique `{provider, providerAccountId}`, userId indexed
  - `Project` — slug unique, userId indexed
  - `ApiKey` — key unique, projectId indexed, isTest flag, revocation fields
  - `File` — compound index `{projectId: 1, createdAt: -1}`, status index, `FILE_STATUSES` enum from shared, deletedAt for soft-delete
  - `FileRouter` — compound unique `{projectId: 1, slug: 1}`, maxFileSize/maxFileCount/allowedTypes config
  - `Subscription` — userId unique, stripeCustomerId unique, stripeSubscriptionId sparse unique, `TIERS` enum from shared
  - `UsageRecord` — compound unique `{userId: 1, period: 1}`, storage/bandwidth/uploads counters

All models use the `mongoose.models['ModelName'] ?? mongoose.model(...)` pattern to prevent "Cannot overwrite model" errors on Next.js hot reload.

15 schema/export tests pass without requiring a live database connection.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `globalThis._mongooseCache` instead of `global.mongoose` | `global.mongoose` creates a TypeScript namespace collision with the `mongoose` import; renaming to `_mongooseCache` resolves the DTS build error cleanly |
| Conditional `if (suggestion !== undefined)` assignment in UploadKitError | `exactOptionalPropertyTypes: true` in tsconfig.base.json disallows `this.suggestion = suggestion` when suggestion can be undefined |
| `types: ["node"]` in packages/db tsconfig | The base tsconfig lib is `ES2022` without node types; `process` and `global` require `@types/node` in the db package tsconfig override |
| `types` condition first in exports map | Correct TypeScript module resolution requires `types` before `import`/`require` in the package.json exports conditions |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added @uploadkit/config devDependency to packages/shared**
- **Found during:** Task 1 build
- **Issue:** `tsconfig.json` extends `@uploadkit/config/typescript/library` but `@uploadkit/config` was not declared as a devDependency
- **Fix:** Added `"@uploadkit/config": "workspace:*"` to devDependencies
- **Files modified:** `packages/shared/package.json`
- **Commit:** e2c1bab

**2. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes violation in errors.ts**
- **Found during:** Task 1 DTS build
- **Issue:** `this.suggestion = suggestion` where suggestion is `string | undefined` fails with `exactOptionalPropertyTypes: true`
- **Fix:** Wrapped assignment in `if (suggestion !== undefined)` guard
- **Files modified:** `packages/shared/src/errors.ts`
- **Commit:** e2c1bab

**3. [Rule 1 - Bug] Added vitest.config.ts to both packages**
- **Found during:** Task 1 test run
- **Issue:** Root vitest config uses `packages/*/tests/**/*.test.ts` include pattern; package-level `vitest run` needed its own config pointing at `tests/**/*.test.ts`
- **Fix:** Added `vitest.config.ts` with correct include pattern to both packages
- **Files modified:** `packages/shared/vitest.config.ts`, `packages/db/vitest.config.ts`
- **Commit:** e2c1bab, b52dd90

**4. [Rule 1 - Bug] Renamed global cache from mongoose to _mongooseCache**
- **Found during:** Task 2 DTS build
- **Issue:** `declare global { var mongoose: ... }` collides with TypeScript's merging of the `mongoose` import namespace, causing DTS build failures
- **Fix:** Renamed to `globalThis._mongooseCache` with a `MongooseCache` interface; updated global declaration accordingly
- **Files modified:** `packages/db/src/connection.ts`
- **Commit:** b52dd90

**5. [Rule 1 - Bug] Added @types/node and types override to packages/db tsconfig**
- **Found during:** Task 2 DTS build
- **Issue:** `process` and `global` not found because base tsconfig lib is `ES2022` only
- **Fix:** `pnpm add -D @types/node` + added `"compilerOptions": { "types": ["node"] }` to tsconfig.json
- **Files modified:** `packages/db/package.json`, `packages/db/tsconfig.json`
- **Commit:** b52dd90

## Known Stubs

None — all exported values are fully implemented and wired.

## Threat Flags

None — no new network endpoints or auth paths introduced. MONGODB_URI is consumed from `process.env` only (T-01-04 mitigated). `maxPoolSize` and `serverSelectionTimeoutMS` are set (T-01-05 mitigated). Tier enum constraint is enforced via mongoose schema (T-01-07 mitigated).

## Self-Check

Files created check:
- packages/shared/src/types.ts: FOUND
- packages/shared/src/constants.ts: FOUND
- packages/shared/src/errors.ts: FOUND
- packages/shared/src/utils.ts: FOUND
- packages/db/src/connection.ts: FOUND
- packages/db/src/models/file.ts: FOUND
- packages/db/src/models/subscription.ts: FOUND

Commits: e2c1bab (Task 1), b52dd90 (Task 2)

## Self-Check: PASSED
