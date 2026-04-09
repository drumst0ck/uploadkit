---
phase: 10-testing-publishing-launch
plan: 02
subsystem: testing
tags: [vitest, testing-library, jsdom, react, unit-tests, xhr-mock]

# Dependency graph
requires:
  - phase: 04-sdk-core-next-js-adapter
    provides: packages/core/src (validation, single, multipart, http, types)
  - phase: 05-react-components
    provides: packages/react/src (useUploadKit hook, UploadKitProvider context)
provides:
  - packages/core/tests/validation.test.ts — 6 validation unit tests
  - packages/core/tests/single.test.ts — 4 single upload flow tests
  - packages/core/tests/multipart.test.ts — 4 multipart upload flow tests
  - packages/core/tests/http.test.ts — 5 HTTP layer tests
  - packages/react/tests/use-upload-kit.test.ts — 8 React hook state machine tests
  - packages/react/vitest.config.ts — jsdom test environment for React
affects: [10-testing-publishing-launch, publishing]

# Tech tracking
tech-stack:
  added:
    - "@testing-library/react ^16.3.2"
    - "@testing-library/jest-dom ^6.9.1"
    - "jsdom ^29.0.2"
    - "vitest ^4.1.3 (react devDep)"
  patterns:
    - XHR constructor mock using regular function (not arrow) for new XHR() compatibility
    - Stable mockClient reference pattern for pre-render mock configuration in React hook tests
    - installXhrFactory() helper to register per-test XHR behavior without re-stubbing
    - vi.mock() hoisted module mock + vi.stubGlobal() for global API replacement

key-files:
  created:
    - packages/core/tests/validation.test.ts
    - packages/core/tests/single.test.ts
    - packages/core/tests/multipart.test.ts
    - packages/core/tests/http.test.ts
    - packages/react/tests/setup.ts
    - packages/react/tests/use-upload-kit.test.ts
    - packages/react/vitest.config.ts
  modified:
    - packages/react/package.json
    - vitest.config.ts

key-decisions:
  - "XHR global mock must use regular function (not arrow) — vi.stubGlobal with arrow fn is not a constructor"
  - "React hook tests define stable mockClient object at module scope, not retrieved from mock.results[] (timing issue)"
  - "packages/react excluded from root vitest.config.ts — needs jsdom env, runs via its own vitest.config.ts"
  - "installXhrFactory() helper encapsulates per-test XHR constructor behavior cleanly"

patterns-established:
  - "Pattern: XHR mock via regular function constructor — function XHRMock() { return instance; } pattern"
  - "Pattern: module-scope mockClient with vi.clearAllMocks() in beforeEach for React hook tests"
  - "Pattern: package-level vitest.config.ts for packages needing non-node environments (jsdom)"

requirements-completed:
  - INFRA-08

# Metrics
duration: 10min
completed: 2026-04-09
---

# Phase 10 Plan 02: SDK + React Unit Tests Summary

**19 new unit tests across 5 files covering core SDK internals (validation, single, multipart, HTTP) and the useUploadKit React hook state machine — all using vi.mock() with no real network calls**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-09T04:44:00Z
- **Completed:** 2026-04-09T04:50:22Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created 4 core test files (19 tests) covering validation constraints, single upload flow with XHR progress/abort, multipart chunking with ETag collection, and HTTP layer auth/error handling
- Created React hook test file (8 tests) covering idle/uploading/success/error state transitions, onProgress callback, abort-to-idle reset, and provider guard enforcement
- Set up packages/react with its own vitest.config.ts (jsdom environment) and @testing-library/react infrastructure
- Root vitest.config.ts updated to exclude react tests (which need jsdom, not node)
- `pnpm turbo test` runs all workspace tests: api (52) + react (8) + next (20) + core (31) + shared (8) = 119 total

## Task Commits

1. **Task 1: Core SDK internal tests** - `29bc2b7` (feat)
2. **Task 2: React useUploadKit hook tests** - `b799619` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core/tests/validation.test.ts` — 6 tests: size limits, MIME type filtering, glob patterns (image/*)
- `packages/core/tests/single.test.ts` — 4 tests: presign→PUT→complete flow, onProgress, abort, presign failure
- `packages/core/tests/multipart.test.ts` — 4 tests: part splitting, ETag collection, complete/uploadId, abort-on-error
- `packages/core/tests/http.test.ts` — 5 tests: Auth header, URL prepend, non-2xx errors, JSON parse, HTTPS enforcement
- `packages/react/tests/setup.ts` — @testing-library/jest-dom setup; @uploadkit/core mock declaration
- `packages/react/tests/use-upload-kit.test.ts` — 8 tests: all upload state machine transitions + provider guard
- `packages/react/vitest.config.ts` — jsdom environment, setupFiles, test glob
- `packages/react/package.json` — added test script + testing devDependencies
- `vitest.config.ts` — added exclude for packages/react/tests (jsdom-only package)

## Decisions Made

- **XHR mock must use regular function:** `vi.stubGlobal('XMLHttpRequest', function XHRMock() { return instance; })` — arrow functions cannot be constructors; vitest warned but the test would throw at `new XMLHttpRequest()` call site.
- **Stable mockClient at module scope:** Rather than accessing `vi.mocked(createUploadKit).mock.results[0]`, the mock returns a stable object defined in the test file. This avoids a timing issue where `createUploadKit` is only called during `renderHook` (after `UploadKitProvider` mounts), making `mock.results[]` empty at the point tests configure the mock before rendering.
- **Package-level vitest config:** `packages/react` gets its own `vitest.config.ts` with jsdom because the root config uses `environment: 'node'`. React's DOM APIs (renderHook, act) require jsdom. This keeps the separation clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] XHR global mock required regular function, not arrow function**
- **Found during:** Task 1 (single.test.ts, multipart.test.ts)
- **Issue:** `vi.stubGlobal('XMLHttpRequest', vi.fn(() => instance))` fails because arrow functions cannot be used as constructors — `new XMLHttpRequest()` at the call site throws `TypeError: ... is not a constructor`
- **Fix:** Changed to `function XHRMock() { return instance; }` pattern in single.test.ts; created `installXhrFactory()` helper using `function XHRFactory(this: unknown) { ... }` in multipart.test.ts
- **Files modified:** packages/core/tests/single.test.ts, packages/core/tests/multipart.test.ts
- **Verification:** All 8 XHR-dependent tests pass

**2. [Rule 1 - Bug] React mock client timing — mock.results[] empty at test setup time**
- **Found during:** Task 2 (use-upload-kit.test.ts)
- **Issue:** `getMockClient()` accessed `vi.mocked(createUploadKit).mock.results[0]?.value` before `renderHook` ran, so `UploadKitProvider` hadn't called `createUploadKit` yet — result was `undefined`, causing `Cannot read properties of undefined (reading 'upload')`
- **Fix:** Defined `mockClient` as a stable module-scope object; the `vi.mock('@uploadkit/core')` factory always returns this same reference; tests configure `mockClient.upload.mockResolvedValue(...)` directly
- **Files modified:** packages/react/tests/use-upload-kit.test.ts
- **Verification:** All 8 React hook tests pass

**3. [Rule 1 - Bug] Root vitest ran React tests under node environment, causing jsdom failures**
- **Found during:** Task 2 verification (root vitest run)
- **Issue:** `packages/*/tests/**/*.test.ts` glob matched `packages/react/tests/use-upload-kit.test.ts` and ran it under `environment: 'node'` — React testing APIs require jsdom
- **Fix:** Added `exclude: ['packages/react/tests/**']` to root `vitest.config.ts`; React tests run exclusively via `packages/react/vitest.config.ts`
- **Files modified:** vitest.config.ts
- **Verification:** Root vitest shows 89 passing (no React), `pnpm turbo test` runs react separately with jsdom

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs)
**Impact on plan:** All fixes necessary for tests to run correctly. No scope creep — same test coverage as planned.

## Issues Encountered

None beyond the 3 auto-fixed issues above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Core SDK has 31 unit tests (7 files): client (7), upload (4), retry (6), http (5), validation (6), single (4), multipart (4) — well above the 17 previously in plan
- React package has 8 hook tests with full jsdom + @testing-library/react infrastructure
- `pnpm turbo test` passes all workspace tests cleanly
- Ready for Plan 03: npm publishing and Plan 04: launch checklist

---
*Phase: 10-testing-publishing-launch*
*Completed: 2026-04-09*
