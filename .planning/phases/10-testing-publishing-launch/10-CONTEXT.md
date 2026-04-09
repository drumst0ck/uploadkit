# Phase 10: Testing, Publishing & Launch - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive Vitest unit tests (~60-80 tests covering all critical paths), multi-flow Playwright E2E tests (5-6 test files), npm publish via Changesets as v0.1.0 beta, polished package READMEs, GitHub Actions CI verification, and launch readiness checklist.

</domain>

<decisions>
## Implementation Decisions

### Test Coverage
- **D-01:** Comprehensive Vitest unit tests (~60-80 tests): upload flow (presign, complete, multipart), API key auth (withApiKey), tier enforcement, Stripe webhook handler, all CRUD endpoints, SDK client methods, React hook state machine, error serializer.
- **D-02:** Multi-flow Playwright E2E tests (5-6 test files): auth (GitHub + email magic link), upload (single + multipart), dashboard CRUD (project, files, API keys), billing checkout, docs site navigation.

### npm Publish
- **D-03:** Initial version 0.1.0 (beta). Signal: early but functional. Semver from here. Not 1.0.0 yet.
- **D-04:** Full polished READMEs per SDK package — install, quickstart code, API overview, links to docs. Not minimal.

### Claude's Discretion
- Test file organization and naming conventions
- Vitest mock strategy (which dependencies to mock vs real)
- Playwright test environment setup (how to handle OAuth in E2E)
- README template design and content depth
- Launch checklist items
- CI pipeline optimization (caching, parallelism)
- Changeset entry creation for initial publish

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §9 Phase 6 — Polish + Launch checklist items
- `UPLOADKIT-GSD.md` §11 — Notes for Claude Code (testing: Vitest unit, Playwright E2E, Changesets)

### Existing Code
- `.github/workflows/ci.yml` — CI pipeline (Phase 1)
- `.github/workflows/release.yml` — Changesets release workflow (Phase 1)
- `.changeset/config.json` — Changesets config (Phase 1)
- `vitest.config.ts` — Root vitest workspace config
- `playwright.config.ts` — Playwright config (Phase 2 scaffolded)
- `e2e/auth/` — Auth E2E stubs (Phase 2 scaffolded)
- `packages/core/tests/` — Core SDK tests (Phase 4 — 17 tests)
- `packages/next/tests/` — Next adapter tests (Phase 4 — 20 tests)
- `apps/api/__tests__/` — API test stubs (Phase 3 scaffolded)

### All Phase Summaries (for coverage audit)
- `.planning/phases/*/0*-SUMMARY.md` — What each phase delivered

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 37 existing tests (17 in core, 20 in next) — Phase 10 adds ~40-60 more
- Playwright config + auth stubs from Phase 2
- CI/CD pipeline already functional from Phase 1
- Changesets config ready for first publish

### Integration Points
- `pnpm turbo test` runs all workspace tests
- `pnpm changeset publish` triggers npm publish
- GitHub Actions CI validates on push
- Release workflow creates version PRs + publishes

</code_context>

<specifics>
## Specific Ideas

- Some existing test stubs from Phase 2 and 3 are intentionally failing (.todo) — Phase 10 should implement them
- For Playwright OAuth E2E: mock OAuth provider OR use Playwright's storage state to bypass login after first run
- README should include badges (npm version, CI status, license)
- Consider a `pnpm verify` root script that runs lint + typecheck + test + build as a single pre-publish gate

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase

</deferred>

---

*Phase: 10-testing-publishing-launch*
*Context gathered: 2026-04-09*
