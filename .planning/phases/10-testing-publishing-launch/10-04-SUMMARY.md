---
phase: 10-testing-publishing-launch
plan: "04"
subsystem: sdk-publishing
tags: [readme, changeset, npm, ci, publishing]
dependency_graph:
  requires: []
  provides: [polished-readmes, initial-changeset, verify-script]
  affects: [packages/core, packages/react, packages/next, .changeset, package.json]
tech_stack:
  added: []
  patterns: [changesets-versioning, turbo-verify-gate]
key_files:
  created:
    - packages/core/README.md
    - packages/react/README.md
    - packages/next/README.md
    - .changeset/initial-release.md
  modified:
    - package.json
decisions:
  - "Changeset type is minor (not patch) — packages are at 0.1.0 so minor bumps to 0.2.0 on next release; initial publish uses versions already in package.json"
  - "verify script chains turbo commands sequentially: lint && typecheck && test && build — mirrors CI order for consistent behavior"
metrics:
  duration: "2m"
  completed: "2026-04-09"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 10 Plan 04: SDK Publishing Preparation Summary

**One-liner:** Polished npm READMEs with badges and quickstarts, initial changeset entry for v0.1.0 beta, and a root `pnpm verify` pre-publish gate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Polished SDK READMEs | 685dcfc | packages/core/README.md, packages/react/README.md, packages/next/README.md |
| 2 | Changeset entry, verify script, CI verification | 166ae4f | .changeset/initial-release.md, package.json |

## What Was Built

### Task 1: Polished SDK READMEs

Three production-ready READMEs following the plan spec:

- **packages/core/README.md**: npm/downloads/license/CI/bundle size badges; one-line description; features list; install (npm/pnpm/yarn); quickstart with `createUploadKit`; API overview table for `createUploadKit`, `client.upload`, `client.listFiles`, `client.deleteFile`; configuration options table; abort example; doc links; MIT license.

- **packages/react/README.md**: Same badge set; features list covering all 5 components and theming; install with peer dep note and CSS import; `UploadKitProvider` + `UploadButton` quickstart; components table; hooks table; theming section with full `--uk-*` custom properties and dark mode example; doc links.

- **packages/next/README.md**: Badges; features list; install with peer dep note; 3-step quickstart (define router, create route handler, use in components); API overview table for `createUploadKitHandler`, `FileRouter`, `generateReactHelpers`; BYOS section with code example; doc links.

All READMEs: TypeScript syntax-highlighted code, under 200 lines, real npm badge URLs.

### Task 2: Changeset Entry, Verify Script, CI Confirmation

- **.changeset/initial-release.md**: `minor` bump for all three publishable packages with descriptive summary of each package's features. Minor chosen because packages start at 0.1.0 in package.json (first publish uses current version; this changeset governs the next release).

- **package.json verify script**: `"verify": "turbo lint && turbo typecheck && turbo test && turbo build"` — pre-publish gate that catches linting, type, test, and build failures before npm publish.

- **CI confirmation**: `.github/workflows/ci.yml` already had the `Test` step running `pnpm turbo test` — no changes required. `turbo.json` already had `"test"` task defined with `outputs: ["coverage/**"]`. Both `packages/react` and `apps/api` already had `"test": "vitest run"` scripts for turbo discovery.

## Deviations from Plan

None — plan executed exactly as written. CI workflow and turbo.json were confirmed correct and required no changes.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. READMEs and changeset are documentation/metadata only. The `"files": ["dist"]` field in each package.json (T-10-06 mitigation) remains intact — no source, test, or config files will be published.

## Self-Check: PASSED

- [x] packages/core/README.md exists
- [x] packages/react/README.md exists
- [x] packages/next/README.md exists
- [x] .changeset/initial-release.md exists with all 3 packages listed as "minor"
- [x] package.json has "verify" script
- [x] Commits 685dcfc and 166ae4f exist in git log
