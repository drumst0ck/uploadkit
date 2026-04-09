---
phase: 10-testing-publishing-launch
plan: "03"
subsystem: e2e-testing
tags: [playwright, e2e, testing, auth, upload, billing, docs]
dependency_graph:
  requires:
    - playwright.config.ts (updated)
    - apps/dashboard (webServer target, port 3001)
    - apps/docs (docs tests target, port 3003)
  provides:
    - e2e/helpers/auth.ts
    - e2e/helpers/storage-state.ts
    - e2e/auth/github.spec.ts (updated)
    - e2e/auth/magic-link.spec.ts (updated)
    - e2e/upload/upload-flow.spec.ts
    - e2e/dashboard/crud.spec.ts
    - e2e/billing/checkout.spec.ts
    - e2e/docs/navigation.spec.ts
  affects:
    - .gitignore (e2e/.auth/ added)
    - package.json (root, @playwright/test added)
tech_stack:
  added:
    - "@playwright/test (workspace root devDependency)"
  patterns:
    - "Playwright setup project for auth state bootstrapping"
    - "Storage state reuse pattern (authenticate once, run all tests)"
    - "Env var gating for tests requiring live OAuth or Stripe"
key_files:
  created:
    - e2e/helpers/auth.ts
    - e2e/helpers/storage-state.ts
    - e2e/upload/upload-flow.spec.ts
    - e2e/dashboard/crud.spec.ts
    - e2e/billing/checkout.spec.ts
    - e2e/docs/navigation.spec.ts
  modified:
    - playwright.config.ts
    - e2e/auth/github.spec.ts
    - e2e/auth/magic-link.spec.ts
    - .gitignore
    - package.json
decisions:
  - "Magic link chosen as primary CI-friendly auth path (OAuth requires live providers)"
  - "Storage state written as empty JSON when E2E_MAGIC_LINK_URL absent so setup project does not block unauthenticated tests"
  - "GitHub OAuth test uses conditional test.skip inside test body (not test.skip() wrapper) to allow env-conditional execution"
  - "Docs tests use hardcoded DOCS_BASE_URL (localhost:3003) overriding the default dashboard baseURL"
  - "Stripe checkout test skipped via test.skip when STRIPE_SECRET_KEY absent (T-10-05)"
metrics:
  duration: "4m"
  completed: "2026-04-09"
  tasks_completed: 2
  files_modified: 11
---

# Phase 10 Plan 03: Playwright E2E Test Suite Summary

**One-liner:** Multi-flow Playwright E2E suite with storage-state auth reuse covering auth, upload, dashboard CRUD, billing, and docs — 21 tests across 10 spec files.

## What Was Built

Six new E2E spec files plus two helpers implement end-to-end coverage for the primary user journeys in UploadKit:

| File | Tests | Coverage |
|------|-------|----------|
| `e2e/helpers/auth.ts` | — | Login helper, STORAGE_STATE_PATH constant |
| `e2e/helpers/storage-state.ts` | 1 (setup) | Auth once, save session to e2e/.auth/user.json |
| `e2e/auth/github.spec.ts` | 1 | GitHub OAuth (env-gated: GITHUB_TEST_EMAIL) |
| `e2e/auth/magic-link.spec.ts` | 2 | Form submit + magic link URL flow (env-gated) |
| `e2e/upload/upload-flow.spec.ts` | 4 | Navigate to project, upload, verify name, delete file |
| `e2e/dashboard/crud.spec.ts` | 5 | Create project, generate API key, logs, usage, delete project |
| `e2e/billing/checkout.spec.ts` | 2 | Current plan display, Stripe Checkout redirect (env-gated) |
| `e2e/docs/navigation.spec.ts` | 3 | Homepage+search, quickstart sidebar, SDK reference |

**Total: 21 tests in 10 files** (`npx playwright test --list` verified)

## Auth Strategy

- **Primary testable flow:** Email magic link (no external OAuth credentials needed)
- **OAuth tests:** `test.skip` by default, conditionally enabled via `GITHUB_TEST_EMAIL` / `GITHUB_TEST_PASSWORD`
- **Storage state:** `e2e/.auth/user.json` — written by setup project, reused by all chromium tests
- **Empty state fallback:** When `E2E_MAGIC_LINK_URL` is absent, setup writes `{ cookies: [], origins: [] }` so the setup project completes and unauthenticated tests (route-protection, docs) can still run

## Configuration Changes

`playwright.config.ts` updated with:
- `timeout: 30_000` for slow local dev server boot
- `storageState: 'e2e/.auth/user.json'` in global `use`
- `setup` project (`testMatch: /storage-state\.ts/`) that runs before `chromium`
- `chromium` project now has `dependencies: ['setup']`
- `webServer` block starts `pnpm --filter @uploadkit/dashboard dev` on port 3001 (reused if already running)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @playwright/test not installed**
- **Found during:** Task 1 verification (`npx playwright test --list` errored with `Cannot find module '@playwright/test'`)
- **Fix:** Installed `@playwright/test` as devDependency at workspace root via `pnpm add -D @playwright/test --workspace-root`
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** efd5fcc

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-10-04 | `e2e/.auth/` added to `.gitignore` — storage state containing session cookies is never committed |
| T-10-05 | Billing checkout test only checks redirect URL pattern (`checkout.stripe.com`), never logs secret keys; test is skipped when `STRIPE_SECRET_KEY` is absent |

## Self-Check: PASSED

Files verified:
- e2e/helpers/auth.ts — FOUND
- e2e/helpers/storage-state.ts — FOUND
- e2e/upload/upload-flow.spec.ts — FOUND
- e2e/dashboard/crud.spec.ts — FOUND
- e2e/billing/checkout.spec.ts — FOUND
- e2e/docs/navigation.spec.ts — FOUND
- playwright.config.ts — FOUND (updated)
- .gitignore — FOUND (e2e/.auth/ added)

Commits verified:
- efd5fcc (Task 1: auth helpers, config, auth specs)
- fc69369 (Task 2: upload, crud, billing, docs specs)

`npx playwright test --list` output: 21 tests in 10 files — all spec files discovered.
