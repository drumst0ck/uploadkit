---
phase: 03-upload-flow-rest-api
plan: "03"
subsystem: rest-api-crud
tags: [api, crud, files, projects, api-keys, file-routers, usage, pagination, r2, sha256]
dependency_graph:
  requires:
    - withApiKey HOF (03-01)
    - serializeError / serializeValidationError (03-01)
    - All DB models: File, Project, ApiKey, FileRouter, UsageRecord (packages/db)
    - Schemas: PaginationSchema, CreateProjectSchema, UpdateProjectSchema, CreateApiKeySchema, CreateFileRouterSchema, UpdateFileRouterSchema, UpdateFileMetadataSchema (03-01)
    - r2Client + R2_BUCKET from lib/storage (03-01)
    - TIER_LIMITS, API_KEY_PREFIX from packages/shared
  provides:
    - GET /api/v1/files — cursor-paginated file list
    - GET/PATCH/DELETE /api/v1/files/:key — single file operations
    - GET/POST /api/v1/projects — project list + create
    - PATCH/DELETE /api/v1/projects/:id — project update + delete
    - GET/POST /api/v1/projects/:id/keys — API key list + create
    - DELETE /api/v1/keys/:keyId — API key revocation
    - GET/POST /api/v1/projects/:id/routers — file router list + create
    - PATCH/DELETE /api/v1/routers/:routerId — file router update + delete
    - GET /api/v1/usage — current period usage + tier limits
    - GET /api/v1/usage/history — last 12 periods
  affects:
    - Dashboard (all project/file/key/router management pages consume these endpoints)
    - SDK (file delete endpoint triggered by SDK file management utilities)
tech_stack:
  added:
    - mongoose (direct dep in apps/api) — for Types.ObjectId in cursor pagination and ObjectId validation
  patterns:
    - Cursor-based pagination using MongoDB _id as opaque cursor (sort _id desc, $lt for next page)
    - Ownership verification chain: all mutations verify resource.projectId -> project.userId == ctx.project.userId
    - Soft delete: File.deletedAt + status=DELETED; hard delete only via R2 + atomic usage $inc
    - SHA256 API key hashing: plaintext generated in memory, hashed before insert, never stored
key_files:
  created:
    - apps/api/src/app/api/v1/files/route.ts
    - apps/api/src/app/api/v1/files/[key]/route.ts
    - apps/api/src/app/api/v1/projects/route.ts
    - apps/api/src/app/api/v1/projects/[id]/route.ts
    - apps/api/src/app/api/v1/projects/[id]/keys/route.ts
    - apps/api/src/app/api/v1/keys/[keyId]/route.ts
    - apps/api/src/app/api/v1/projects/[id]/routers/route.ts
    - apps/api/src/app/api/v1/routers/[routerId]/route.ts
    - apps/api/src/app/api/v1/usage/route.ts
    - apps/api/src/app/api/v1/usage/history/route.ts
  modified:
    - apps/api/package.json — added mongoose as direct dependency
decisions:
  - mongoose added as direct dep to apps/api (not transitive through @uploadkit/db) because Types.ObjectId is needed for cursor pagination and ObjectId validation in route handlers
  - API key full plaintext returned only at POST creation response, never retrievable again (T-03-15)
  - File DELETE uses soft-delete (deletedAt + status=DELETED) in MongoDB after hard delete from R2 to prevent double-decrement on retry (T-03-16)
  - Project DELETE cascades key revocation via ApiKey.updateMany with revokedAt
  - Duplicate slug on FileRouter creation returns HTTP 409 (MongoDB error code 11000)
  - Optional fields in CreateFileRouterSchema spread explicitly to satisfy exactOptionalPropertyTypes: true
metrics:
  duration: 4m
  completed: "2026-04-08T13:00:56Z"
  tasks: 2
  files: 10
---

# Phase 03 Plan 03: REST API CRUD Endpoints Summary

Complete CRUD REST API surface — 10 route files covering Files, Projects, API Keys, File Routers, and Usage with full auth scoping, tier enforcement, and security controls per threat model.

## What Was Built

### Task 1: Files and Projects CRUD (commit `0326c49`)

**Files endpoint** (`/api/v1/files`):
- Cursor-based pagination using MongoDB `_id` as opaque cursor — sort `{ _id: -1 }`, filter `$lt: new Types.ObjectId(cursor)`, returns `{ files, nextCursor, hasMore }`
- All queries scoped to `ctx.project._id` to prevent cross-project access (T-03-13)

**Single file endpoint** (`/api/v1/files/:key`):
- URL param decoded with `decodeURIComponent` — handles keys containing slashes (`{projectId}/{routeSlug}/{nanoid}/{filename}`)
- DELETE: R2 `DeleteObjectCommand` → soft-delete (`deletedAt`, `status: DELETED`) → atomic `$inc: { storageUsed: -file.size }` (T-03-16)

**Projects endpoint** (`/api/v1/projects`):
- GET lists all projects for the user (not scoped to API key's project)
- POST enforces `TIER_LIMITS[ctx.tier].maxProjects`, generates `{sanitized-name}-{nanoid(6)}` slug

**Project by ID endpoint** (`/api/v1/projects/:id`):
- PATCH: validates ObjectId, updates name via `findOneAndUpdate` scoped to `userId`
- DELETE: cascades to revoke all API keys via `ApiKey.updateMany` before deleting project

### Task 2: API Keys, File Routers, Usage (commit `0bfb77b`)

**API keys endpoint** (`/api/v1/projects/:id/keys`):
- GET returns keys without `keyHash` field (`.select('-keyHash')`)
- POST: verifies project ownership → checks `TIER_LIMITS[ctx.tier].maxApiKeys` → generates `uk_live_*` or `uk_test_*` + nanoid(32) → SHA256 hash stored, plaintext returned once in `{ key: fullKey }` (T-03-15)

**Key revocation** (`/api/v1/keys/:keyId`):
- DELETE verifies key exists → verifies `key.projectId → project.userId` ownership chain → sets `revokedAt` (T-03-14)

**File routers** (`/api/v1/projects/:id/routers`, `/api/v1/routers/:routerId`):
- POST handles MongoDB 11000 duplicate key error → HTTP 409
- PATCH/DELETE verify ownership chain through `router.projectId → project.userId` (T-03-17)

**Usage** (`/api/v1/usage`, `/api/v1/usage/history`):
- Current period: `new Date().toISOString().slice(0, 7)` → returns `{ usage, limits: TIER_LIMITS[ctx.tier] }`
- History: last 12 records sorted by period descending

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added mongoose as direct dependency to apps/api**
- **Found during:** Task 1 build
- **Issue:** `import { Types } from 'mongoose'` failed — mongoose was only in `@uploadkit/db`'s deps, not a direct dep of `apps/api`. Next.js bundler cannot resolve transitive-only deps this way.
- **Fix:** Added `"mongoose": "^9.4.1"` to `apps/api/package.json` dependencies and ran `pnpm install`
- **Files modified:** `apps/api/package.json`
- **Commit:** `0326c49`

**2. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes in FileRouter.create call**
- **Found during:** Task 2 build
- **Issue:** Spreading `parsed.data` (which has `maxFileSize?: number | undefined`) into `FileRouter.create()` failed TypeScript with `exactOptionalPropertyTypes: true` — `undefined` not assignable where `number` expected
- **Fix:** Explicit payload object with conditional property assignment using `if (x !== undefined)` guards
- **Files modified:** `apps/api/src/app/api/v1/projects/[id]/routers/route.ts`
- **Commit:** `0bfb77b`

## Known Stubs

None — all endpoints are fully wired to MongoDB and R2.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model. All T-03-13 through T-03-17 mitigations are implemented.

## Self-Check: PASSED
