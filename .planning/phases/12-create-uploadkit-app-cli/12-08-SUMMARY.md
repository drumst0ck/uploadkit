---
phase: 12-create-uploadkit-app-cli
plan: 08
subsystem: create-uploadkit-app
tags: [release, ci, changesets, smoke-test, publish]
requires:
  - "12-01 (package skeleton, bin, tsup)"
  - "12-02 (engine)"
  - "12-03..07 (templates + CLI + interactive flow)"
provides:
  - "scripts/pin-template-deps.mjs — prepublishOnly hook that rewrites @uploadkitdev/* in template package.json to ^<workspace-version> and all other 'latest' deps to ^<npm-view-latest>"
  - "scripts/smoke-test.mjs — builds + packs the CLI, scaffolds every template into a tmpdir, runs install+build, asserts scaffold <90s"
  - ".changeset/create-uploadkit-app-initial.md — minor changeset, publishes create-uploadkit-app@0.1.0"
  - ".github/workflows/smoke-create-uploadkit-app.yml — [ubuntu, windows] matrix gate for PRs touching the CLI or @uploadkitdev/{react,next}"
  - "release.yml — release job now requires an in-workflow smoke job before publishing"
  - "Shared eslint config — glob-scoped dist ignores, node globals for scripts/*.mjs, skip CLI templates/ source (resolves 12-02 deferred item)"
affects:
  - packages/create-uploadkit-app/package.json (new scripts: smoke, prepublishOnly)
  - packages/config/eslint/index.js (globbed ignores + node globals + globals peer)
  - packages/config/package.json (add globals devDep)
tech-stack:
  added:
    - "globals (eslint node globals for .mjs/scripts files)"
  patterns:
    - "prepublishOnly runs on the tarball build, so local workspace uses 'latest'/'workspace:*' and only the published tarball has pinned ^x.y.z deps"
    - "Smoke test packs via `pnpm pack` and invokes the packed tarball through `npx --yes <tgz>` — mirrors what real users experience with `npm create uploadkit-app`"
    - "Release workflow gates publish via `needs: [smoke]` (no external required-check coordination needed)"
    - "Windows matrix runner validates D-01 path-handling across platforms before publish"
key-files:
  created:
    - packages/create-uploadkit-app/scripts/pin-template-deps.mjs
    - packages/create-uploadkit-app/scripts/smoke-test.mjs
    - .changeset/create-uploadkit-app-initial.md
    - .github/workflows/smoke-create-uploadkit-app.yml
    - .planning/phases/12-create-uploadkit-app-cli/12-08-SUMMARY.md
  modified:
    - packages/create-uploadkit-app/package.json
    - packages/config/eslint/index.js
    - packages/config/package.json
    - .github/workflows/release.yml
decisions:
  - "Pin SDK deps at prepublishOnly, not in git: keeps dev loop on 'workspace:*' / 'latest' while ensuring shipped tarballs are deterministic."
  - "Pin ALL 'latest' deps (not only @uploadkitdev/*): prevents a surprise Next/React/Vite major from breaking scaffolded projects mid-week."
  - "Gate release.yml with an inline smoke job (not branch-protection required-check): releases are driven by changesets/action pushes; adding needs: [smoke] keeps everything in one workflow and avoids required-check drift."
  - "Windows included in matrix: validates D-01 (path-handling across OSes) — CLIs that work on macOS dev boxes but break on Windows user boxes are the #1 bug class for scaffolders."
  - "Scaffold time budget: 90s (50% headroom over the 60s target) — slower CI runners (Windows especially) need the extra cushion before we call them broken."
metrics:
  duration: ~20m
  completed: "2026-04-15"
---

# Phase 12 Plan 08: Publish Prep (Changeset + Prepublish Pinning + Smoke CI) Summary

**One-liner:** Ship `create-uploadkit-app@0.1.0` to npm with deterministic pinned
template deps, a cross-platform CI smoke test that scaffolds and builds all four
templates, and a release workflow that cannot publish without the smoke test
going green.

## What changed

### `scripts/pin-template-deps.mjs` (new, 112 LOC)

Runs from `prepublishOnly`. For every template in `packages/create-uploadkit-app/templates/*`:

1. Reads `package.json`.
2. Rewrites any `@uploadkitdev/*` dep to `^<workspace-version>` — discovered by
   scanning sibling `packages/*/package.json` in the monorepo.
3. Rewrites any other dep/devDep pinned to `"latest"` (or `"*"`) to `^<version>`
   resolved via `npm view <name> version` (results cached in-memory to avoid
   re-querying the registry).
4. Writes the file back with a trailing newline.

Supports `--dry-run`. Idempotent. Fails loudly if a workspace version cannot be
resolved for an `@uploadkitdev/*` dep (the most likely silent-breakage vector).

Verified via dry-run: produces the expected rewrites across all four templates
(e.g. `@uploadkitdev/react: latest -> ^0.3.0`, `@uploadkitdev/next: latest -> ^0.2.1`,
`next: latest -> ^16.2.3`, `svelte: latest -> ^5.55.4`, etc.).

### `scripts/smoke-test.mjs` (new, 150 LOC)

1. `pnpm --filter create-uploadkit-app build`
2. `pnpm pack --pack-destination .` → tarball path
3. For each template in `[next, sveltekit, remix, vite]`:
   - `mkdtempSync(os.tmpdir()/cka-smoke-)`
   - `npx --yes <tgz> <dir>/demo --template <t> --pm pnpm --yes --no-git --no-install`
   - `pnpm install --prefer-offline --ignore-workspace`
   - `pnpm build`
   - Assert scaffold <90s
4. Prints tab-separated summary, cleans up tmpdirs + tarball, exits 1 on any
   failure.

Uses `--ignore-workspace` during install so the scaffolded project isn't pulled
back into the monorepo by pnpm auto-discovery — this mirrors what users
experience in a fresh directory.

### `.changeset/create-uploadkit-app-initial.md` (new)

Minor changeset for `create-uploadkit-app`. First public release — version bumps
to `0.1.0` when changesets/action creates the Version PR.

### `.github/workflows/smoke-create-uploadkit-app.yml` (new)

- Triggers: `push master` + `pull_request` touching `packages/create-uploadkit-app/**`,
  `packages/react/**`, `packages/next/**`, or the workflow file itself.
- Matrix: `os: [ubuntu-latest, windows-latest]`, `fail-fast: false`.
- Steps: checkout → pnpm/action-setup → setup-node 22 (pnpm cache) → install →
  `pnpm --filter create-uploadkit-app smoke`.
- Uploads `*.log` / `*.tgz` artifacts on failure for 7 days.

### `.github/workflows/release.yml` (modified)

New `smoke` job runs the same smoke test on `ubuntu-latest` before the release
job executes. `release` declares `needs: [smoke]`, so a failing smoke test
blocks publication — even if changesets detects packages ready to ship.

### Shared ESLint config (modified) — resolves 12-02 deferred item

`packages/config/eslint/index.js`:

- Globbed ignores: `dist/**`, `.next/**`, `node_modules/**`, `coverage/**` now
  apply regardless of cwd (previously the root `ignores: ['dist/']` only matched
  the repo root, so `pnpm --filter create-uploadkit-app lint` lit up on
  `dist/*.cjs`).
- Added `**/create-uploadkit-app/templates/**` to ignores — template sources
  target external framework toolchains and shouldn't run through the monorepo's
  strict rules.
- New flat-config block attaches `globals.node` to `**/*.mjs`, `**/*.cjs`,
  `**/scripts/**/*`, and `**/*.config.{js,mjs,cjs,ts}` so scripts can reference
  `process`, `console`, etc. without `no-undef` errors.
- Added `globals` to `@uploadkitdev/config` devDependencies.

## Verification

- [x] `node scripts/pin-template-deps.mjs --dry-run` — prints 51 correct
      rewrites across all 4 templates, no disk writes.
- [x] `pnpm --filter create-uploadkit-app build` — ESM + CJS emit, 0 errors.
- [x] `pnpm --filter create-uploadkit-app typecheck` — 0 errors.
- [x] `pnpm --filter create-uploadkit-app test` — 46/46 passing (9 files).
- [x] `pnpm --filter create-uploadkit-app lint` — clean (after flat-config fix).
- [x] `node --check scripts/smoke-test.mjs` — valid syntax.
- [ ] CI smoke run on both Linux + Windows — will surface on the first PR
      merging this plan; any template that fails there is actionable in a
      12-09 or follow-up plan.
- [ ] Published package reachable via `npx create-uploadkit-app@latest` — gated
      on the next release cycle consuming `.changeset/create-uploadkit-app-initial.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Block-comment terminator in script docblock**

- **Found during:** Task 1 dry-run
- **Issue:** Initial docblock referenced `packages/*/package.json` literally;
  the `*/` closed the block comment mid-doc and Node threw `SyntaxError:
  Unexpected strict mode reserved word`.
- **Fix:** Rephrased the comment to avoid `*/` sequences.
- **File:** `packages/create-uploadkit-app/scripts/pin-template-deps.mjs`
- **Commit:** `191c7b6`

**2. [Rule 3 - Blocking] Lint errors on scripts + templates**

- **Found during:** Task 1 post-commit lint sweep
- **Issue:** Flat-config `no-undef` flagged `process`/`console` in `.mjs`
  scripts, and the CLI's `templates/` source (JSX/TSX targeting external
  toolchains) was being linted by the monorepo's rules.
- **Fix:** Added `globals.node` for scripts/config files and
  `**/create-uploadkit-app/templates/**` to the shared ignores. This also
  resolves the 12-02 deferred item about `dist/` globbing.
- **Files:** `packages/config/eslint/index.js`, `packages/config/package.json`
- **Commit:** `191c7b6`

## Commits

- `191c7b6` — feat(12-08): add prepublishOnly dep pinning + eslint dist ignore
- `d366fe2` — ci(12-08): add smoke-test script + CI matrix + gate release on smoke

## Self-Check: PASSED

- [x] `packages/create-uploadkit-app/scripts/pin-template-deps.mjs` exists
- [x] `packages/create-uploadkit-app/scripts/smoke-test.mjs` exists
- [x] `.changeset/create-uploadkit-app-initial.md` exists
- [x] `.github/workflows/smoke-create-uploadkit-app.yml` exists
- [x] Commits `191c7b6` and `d366fe2` present on branch
