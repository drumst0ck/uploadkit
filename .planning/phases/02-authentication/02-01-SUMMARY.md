---
phase: 02-authentication
plan: 01
subsystem: authentication
tags: [auth, nextauth, mongodb, oauth, magic-link, session, proxy]
dependency_graph:
  requires:
    - packages/db (connectDB, Project model)
    - packages/shared (FILE_STATUSES, TIERS enums)
  provides:
    - Auth.js v5 backend (handlers, auth, signIn, signOut)
    - Database session strategy (MongoDB via Mongoose pool)
    - Route protection proxy for /dashboard/*
    - getAuthMongoClient() for adapter bridging
  affects:
    - apps/dashboard (auth route handler, proxy)
    - packages/db (new auth-client.ts export)
tech_stack:
  added:
    - next-auth@5.0.0-beta.30
    - "@auth/mongodb-adapter@^3.11.1"
    - nodemailer@^8.0.5
    - resend@^6.10.0
    - nanoid@^5.1.7
    - mongodb@^7.1.1 (devDep in packages/db for DTS types)
  patterns:
    - "Auth.js v5 async lazy factory: NextAuth(async () => config)"
    - "Edge split: auth.config.ts (no DB) vs auth.ts (full adapter)"
    - "MongoClient bridge: mongoose.connection.getClient() for @auth/mongodb-adapter"
    - "Next.js 16 proxy.ts for route protection"
key_files:
  created:
    - packages/db/src/auth-client.ts
    - apps/dashboard/auth.config.ts
    - apps/dashboard/auth.ts
    - apps/dashboard/proxy.ts
    - apps/dashboard/src/app/api/auth/[...nextauth]/route.ts
    - packages/db/src/__tests__/auth-events.test.ts
    - e2e/auth/github.spec.ts
    - e2e/auth/google.spec.ts
    - e2e/auth/magic-link.spec.ts
    - e2e/auth/magic-link.spec.ts
    - e2e/auth/session-persistence.spec.ts
    - e2e/auth/route-protection.spec.ts
    - playwright.config.ts
  modified:
    - packages/db/src/index.ts
    - packages/db/package.json
    - packages/shared/package.json
    - apps/dashboard/package.json
    - apps/dashboard/next.config.ts
    - apps/dashboard/tsconfig.json
    - .env.example
decisions:
  - "Async lazy factory pattern for Auth.js: NextAuth(async () => config) ensures connectDB() runs before adapter init on every cold start"
  - "packages/db and packages/shared package.json main/exports corrected from index.cjs to index.js to match tsup output"
  - "declaration: false added to dashboard tsconfig.json — Next.js apps don't need .d.ts emit; avoids non-portable AppRouteHandlerFn type error"
  - "transpilePackages extended with @uploadkit/db and @uploadkit/shared in next.config.ts for correct monorepo resolution"
  - "mongodb added as devDependency to packages/db for DTS build type resolution only — not a runtime dep"
metrics:
  duration: "7m"
  completed: "2026-04-08"
  tasks_completed: 3
  files_created: 13
  files_modified: 7
---

# Phase 02 Plan 01: Auth.js v5 Backend Configuration Summary

**One-liner:** Auth.js v5 backend with GitHub/Google OAuth + Resend magic link, MongoDB database sessions via Mongoose pool bridge, and Next.js 16 proxy route protection for /dashboard/*.

## What Was Built

Three tasks completed atomically:

**Task 0 — Test Scaffolds (Wave 0):** Created 6 test files defining the auth test contracts before implementation. Unit test for `createUser` event (3 intentionally failing tests), 5 Playwright E2E specs (4 skipped pending credentials, 1 active route-protection test), and `playwright.config.ts` at monorepo root.

**Task 1 — Auth.js Backend:** Installed `next-auth@beta`, `@auth/mongodb-adapter`, `nodemailer`, `resend`, `nanoid`. Created the full auth stack:
- `packages/db/src/auth-client.ts` — async function extracting `MongoClient` from Mongoose connection via `getClient()`, shared pool with adapter
- `apps/dashboard/auth.config.ts` — Edge-safe config with GitHub, Google, Resend providers and `authorized` callback protecting `/dashboard/*`
- `apps/dashboard/auth.ts` — Full server config using async lazy factory pattern, `strategy: 'database'`, 30-day sessions, `createUser` event auto-creates "My First Project" with idempotency guard
- `apps/dashboard/proxy.ts` — Next.js 16 proxy importing only from `auth.config.ts` (no DB in Edge runtime)
- `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts` — Route handler exporting GET and POST

**Task 2 — Env Docs:** Updated `.env.example` with all Auth.js v5 env vars (`AUTH_*` naming convention) with sourcing instructions. Replaced legacy `NEXTAUTH_*` vars.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DTS build failed: mongodb types not available in packages/db**
- **Found during:** Task 1, Step 2 (db package build)
- **Issue:** `auth-client.ts` uses `import type { MongoClient } from 'mongodb'` but `mongodb` package wasn't in packages/db devDependencies — DTS build (tsup) couldn't resolve the type
- **Fix:** Added `mongodb` as devDependency to `packages/db` for type-only resolution
- **Files modified:** `packages/db/package.json`
- **Commit:** 5a93e11

**2. [Rule 3 - Blocking] packages/db and packages/shared package.json main/exports mismatch with tsup output**
- **Found during:** Task 1, dashboard build
- **Issue:** Both packages had `"main": "./dist/index.cjs"` and `"require": "./dist/index.cjs"` but tsup outputs `index.js` (CJS) and `index.mjs` (ESM) — not `.cjs` files. Dashboard build failed resolving `@uploadkit/shared` from `@uploadkit/db` dist
- **Fix:** Updated both package.json files: `main` → `./dist/index.js`, `module` → `./dist/index.mjs`, exports `import` → `index.mjs`, `require` → `index.js`
- **Files modified:** `packages/db/package.json`, `packages/shared/package.json`
- **Commit:** 5a93e11

**3. [Rule 3 - Blocking] @uploadkit/db and @uploadkit/shared not in dashboard dependencies**
- **Found during:** Task 1, dashboard build
- **Issue:** `auth.ts` imports from `@uploadkit/db` but it wasn't listed in `apps/dashboard/package.json`
- **Fix:** Added `@uploadkit/db@workspace:*` and `@uploadkit/shared@workspace:*` to dashboard dependencies; added both to `transpilePackages` in `next.config.ts`
- **Files modified:** `apps/dashboard/package.json`, `apps/dashboard/next.config.ts`
- **Commit:** 5a93e11

**4. [Rule 3 - Blocking] TypeScript portable-type errors in auth.config.ts and auth.ts**
- **Found during:** Task 1, TypeScript type check phase of build
- **Issue 1:** `authConfig` inferred type referenced `EmailConfig` from internal `@auth/core` — fixed by adding explicit `: NextAuthConfig` type annotation
- **Issue 2:** Destructured `auth` export inferred `AppRouteHandlerFn` type from `next-auth/lib/types` — not portable because declaration emit was on. Fixed by adding `"declaration": false, "declarationMap": false` to dashboard `tsconfig.json` (Next.js apps don't need `.d.ts` files)
- **Fix:** Explicit type annotation on `authConfig`; disabled declaration emit in dashboard tsconfig; wrapped `NextAuth()` result as `NextAuthResult` type
- **Files modified:** `apps/dashboard/auth.config.ts`, `apps/dashboard/auth.ts`, `apps/dashboard/tsconfig.json`
- **Commit:** 5a93e11

**5. [Rule 3 - Blocking] Relative import depth incorrect in route.ts**
- **Found during:** Task 1, initial build attempt
- **Issue:** Used `../../../../auth` (4 levels up from `[...nextauth]/`) but needed `../../../../../auth` (5 levels) to reach dashboard root from `src/app/api/auth/[...nextauth]/route.ts`
- **Fix:** Corrected to `../../../../../auth`
- **Files modified:** `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts`
- **Commit:** 5a93e11

## Known Stubs

None — all auth backend functionality is wired. The test scaffolds (`auth-events.test.ts`) have intentionally failing placeholder tests that are expected to remain red until a future plan implements the test logic against the real `createUser` helper.

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model. The `redirect` callback explicitly validates same-origin (T-02-03), proxy.ts has no DB imports (Edge safety), and AUTH_SECRET is documented in `.env.example` (T-02-08).

## Self-Check: PASSED

All 7 key files exist on disk. All 3 task commits verified in git log (a782e11, 5a93e11, 0e51e7a). Dashboard builds successfully with no Edge runtime errors.
