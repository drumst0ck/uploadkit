---
phase: 12-create-uploadkit-app-cli
plan: 03
subsystem: create-uploadkit-app
tags: [cli, scaffold, engine, copy, render, install, git]
requires:
  - "12-01 (package skeleton, tsup build, execa/clack/picocolors installed)"
  - "12-02 (ResolvedOptions contract, runPrompts, parseArgs, CancelledError)"
provides:
  - "copyTemplate(src, dest) with dotfile rename + skip-dirs"
  - "renderPlaceholders(content, vars) literal {{name}}/{{pkgManager}}/{{year}} substitution"
  - "renderProjectFiles(projectDir, vars) over package.json/README.md/.env*"
  - "writeEnvLocal(dir) — idempotent .env.local scaffolder"
  - "installDeps(dir, pm) per-PM execa invocation"
  - "initGit(dir) soft-failing git init + add + initial commit"
  - "scaffold(opts, overrides?) orchestrator wired into main()"
  - "templates/ directory (with .gitkeep) as the template drop site for Wave 3"
affects: []
tech-stack:
  added: []
  patterns:
    - "ESM-primary templatesRoot resolution with __dirname fallback for the CJS tsup output"
    - "copyTemplate uses node:fs/promises recursive walk — no fs-extra / cpy dep"
    - "Filename rename map (_gitignore/_env/_env.local/_npmignore/_env.example → dotted) applied only on direct children during recursion"
    - "Skip list is directory-name match (node_modules, dist, .next, .svelte-kit, build, .react-router)"
    - "initGit sets GIT_AUTHOR_* / GIT_COMMITTER_* envs so the initial commit succeeds on machines without global git config"
    - "Install failure is caught and rendered as a yellow warning; scaffolding still completes and the user is told how to run install manually"
key-files:
  created:
    - packages/create-uploadkit-app/src/engine/copy.ts
    - packages/create-uploadkit-app/src/engine/render.ts
    - packages/create-uploadkit-app/src/engine/env.ts
    - packages/create-uploadkit-app/src/engine/install.ts
    - packages/create-uploadkit-app/src/engine/git.ts
    - packages/create-uploadkit-app/src/engine/index.ts
    - packages/create-uploadkit-app/src/__tests__/engine.test.ts
    - packages/create-uploadkit-app/src/__fixtures__/mini-template/_gitignore
    - packages/create-uploadkit-app/src/__fixtures__/mini-template/package.json
    - packages/create-uploadkit-app/src/__fixtures__/mini-template/README.md
    - packages/create-uploadkit-app/templates/.gitkeep
  modified:
    - packages/create-uploadkit-app/src/index.ts
decisions:
  - "Use node:fs/promises for recursive copy instead of adding fs-extra — the skip/rename rules are simple enough to inline and avoid a dep"
  - "yarn install command is bare `yarn` (not `yarn install`) — idiomatic and avoids yarn's deprecation message about `install`"
  - "writeEnvLocal is idempotent: if the template shipped a .env.local we leave it alone; only otherwise we scaffold the UPLOADKIT_API_KEY placeholder"
  - "Missing template produces a friendly error string with exit 1, not a stack trace — lets this plan ship before Wave 3 templates exist"
  - "initGit soft-fails (try/catch + yellow warning) so a bad git environment never blocks scaffolding"
  - "scaffold accepts a ScaffoldOverrides (templatesRoot, force) — keeps the function test-friendly without leaking prompt concerns into the engine"
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 03: Template Engine (copy, render, install) — Summary

Built the template engine that Wave 3 templates drop into. Given a
`ResolvedOptions`, `scaffold()` creates the project directory, recursively
copies a named template from `packages/create-uploadkit-app/templates/<id>/`
while renaming `_gitignore` / `_env*` back to their dot-prefixed forms,
renders `{{name}}` / `{{pkgManager}}` / `{{year}}` placeholders in
`package.json` / `README.md` / `.env*`, ensures `.env.local` exists with a
placeholder UploadKit key + signup-link comment, runs the detected package
manager install, and initialises a git repo with a soft-failing initial
commit. The CLI's `main()` now calls `scaffold()` instead of echoing the
resolved-options JSON blob from 12-02.

## What Landed

### Task 1 — copy + render + env (TDD)

- `engine/copy.ts`: recursive walker using `node:fs/promises`. Skips
  `node_modules`, `dist`, `.next`, `.svelte-kit`, `build`, `.react-router`.
  Renames `_gitignore` → `.gitignore`, `_npmignore` → `.npmignore`, `_env` →
  `.env`, `_env.local` → `.env.local`, `_env.example` → `.env.example`.
- `engine/render.ts`: `renderPlaceholders(content, vars)` — literal
  `String.replace` pass for the three supported placeholders.
  `renderProjectFiles(projectDir, vars)` applies it in-place over
  `package.json`, `README.md`, `.env`, `.env.local`, `.env.example` (no-op
  if the file isn't present). Unknown placeholders are left alone.
- `engine/env.ts`: `writeEnvLocal(dir)` idempotently writes the two-line env
  file (`# UploadKit — get a real key at https://uploadkit.dev/signup` +
  `UPLOADKIT_API_KEY=uk_test_placeholder`). Does nothing if the template
  shipped a `.env.local` of its own.
- `__fixtures__/mini-template/` — throwaway three-file template (package.json,
  README.md, _gitignore) referenced only by tests, drives full end-to-end
  rename + render + env assertions without depending on Wave 3 templates.
- `__tests__/engine.test.ts` — 11 new tests across copy / render / env /
  e2e-on-fixture. Each test scaffolds into `os.tmpdir()` and cleans up in
  `afterEach`.

### Task 2 — install + git + orchestrator + CLI wiring

- `engine/install.ts`: per-PM argv selector used by `installDeps(dir, pm)`.
  Uses `execa` with `stdio: 'inherit'` so the user sees the live install log.
  - `pnpm install`
  - `npm install`
  - `yarn` (bare, not `yarn install`)
  - `bun install`
- `engine/git.ts`: `initGit(dir)` runs `git init` → `git add -A` → `git commit
  -m "chore: initial commit from create-uploadkit-app"`. Entire block wrapped
  in try/catch; on failure prints a single-line yellow `!` warning and
  returns (scaffolding continues). Sets `GIT_AUTHOR_*`/`GIT_COMMITTER_*`
  envs to sensible defaults so the commit succeeds on CI / fresh boxes
  without a global git config.
- `engine/index.ts`: `scaffold(opts, overrides?)` orchestrates
  1) template existence check (friendly error if missing),
  2) project-dir create / non-empty guard (unless `overrides.force`),
  3) `copyTemplate` (with a @clack/prompts spinner),
  4) `renderProjectFiles` over the renderable set,
  5) `writeEnvLocal`,
  6) `installDeps` (if `opts.install`) — failures are warned, not thrown,
  7) `initGit` (if `opts.gitInit`) — soft-fails internally,
  8) prints a "Next steps" block with `cd`, optional install, and `<pm> run dev`.
- `engine/index.ts` `resolveTemplatesRoot()`: handles both the bundled path
  (`dist/index.js` → `../templates`) and the dev / vitest path
  (`src/engine/index.ts` → `../../templates`) by trying both and falling
  back to the first.
- `src/index.ts`: replaced the Wave-2 JSON echo with `await scaffold(options,
  { force: parsed.force })`, mapping thrown errors to `exit 1` with a red
  `error` prefix. `p.outro('✓ Done.')` closes the Clack session on success.

## File-rename Conventions (shipped)

| Template filename | Written as      |
|-------------------|-----------------|
| `_gitignore`      | `.gitignore`    |
| `_npmignore`      | `.npmignore`    |
| `_env`            | `.env`          |
| `_env.local`      | `.env.local`    |
| `_env.example`    | `.env.example`  |

Rationale: npm strips leading-dot files from publish tarballs unless you
ship the dotted form explicitly in `files[]`. The underscore-prefixed form
is the widely-used convention (create-vite, create-t3-app, etc.) and keeps
the Wave 3 template authors free of that gotcha.

## Per-PM install Invocations (shipped)

| PM    | argv                    |
|-------|-------------------------|
| pnpm  | `pnpm install`          |
| npm   | `npm install`           |
| yarn  | `yarn` (no subcommand)  |
| bun   | `bun install`           |

The plan allowed deviation here and explicitly called out yarn's
bare-`yarn` idiom; no further deviations from the plan's recipe.

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter create-uploadkit-app typecheck` | passes |
| `pnpm --filter create-uploadkit-app test` | 5 files / 42 tests pass |
| `pnpm --filter create-uploadkit-app build` | ESM 15.58 KB, CJS 18.84 KB |
| Manual e2e: copied mini-template into `templates/next`, ran `dist/index.js demo-app --template next --pm npm --no-install --no-git --yes` | `.gitignore` / `package.json` / `README.md` / `.env.local` all correct; placeholders rendered; success outro printed |
| Manual: `--template sveltekit` with no `templates/sveltekit/` dir | prints `error Template 'sveltekit' not yet shipped — run Wave 3 plans (12-04..12-07).` and exits 1 |

### Sample scaffolded package.json (fixture)

```json
{
  "name": "demo-app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "npm run dev",
    "build": "npm run build"
  }
}
```

### Sample scaffolded .env.local

```
# UploadKit — get a real key at https://uploadkit.dev/signup
UPLOADKIT_API_KEY=uk_test_placeholder
```

## Deviations from Plan

**1. [Rule 2 — Missing critical functionality] CJS build fallback for `resolveTemplatesRoot`.**
- **Found during:** Task 2 build step.
- **Issue:** tsup emits both ESM (`dist/index.js`, used by the bin) and CJS
  (`dist/index.cjs`). `import.meta.url` is empty in the CJS output, so
  `fileURLToPath(import.meta.url)` would throw if the CJS build were ever
  loaded.
- **Fix:** Guard the ESM path with a `metaUrl` check and fall back to
  `__dirname` (present in the CJS shim) or `process.cwd()` if neither is
  available. The bin still uses ESM, so this is defensive for any future
  consumer that `require()`s the CJS output.
- **Commit:** `ef3c18b`

**2. [Rule 2 — Missing critical functionality] `GIT_AUTHOR_*` / `GIT_COMMITTER_*` envs on `git commit`.**
- **Found during:** Drafting `initGit`.
- **Issue:** `git commit` fails with `Please tell me who you are` on any
  machine without `user.email` / `user.name` configured globally. That
  includes clean CI runners.
- **Fix:** Pass safe defaults (`UploadKit <noreply@uploadkit.dev>`) via env
  vars so the commit succeeds deterministically. Real commits thereafter
  use the user's global config (git reads from `HEAD^` onwards).
- **Commit:** `ef3c18b`

**3. Extra `_npmignore` / `_env.example` rename entries.**
- The plan enumerates `_gitignore` + `_env.local` explicitly. I added
  `_npmignore`, `_env`, and `_env.example` to the rename map pre-emptively
  because Wave 3 templates (especially `next` and `sveltekit`) will want
  them. Behaviour is additive and doesn't affect tested cases.

## Known Stubs

- `packages/create-uploadkit-app/templates/` contains only `.gitkeep`. That
  is by design — Plans 12-04..07 drop real templates in, and `scaffold()`
  already prints a friendly error if the requested one is missing. No
  template is shipped in this plan.
- `src/__fixtures__/mini-template/` is a test-only template (three files,
  no dependencies). It is never published (sits under `src/`, excluded
  by `files: ["dist", "templates"]`).

## Commits

- `79e8e79` — `test(12-03): add failing tests for engine copy/render/env`
- `f21d9b1` — `feat(12-03): implement engine copy, render, and env modules`
- `ef3c18b` — `feat(12-03): add install, git, orchestrator and wire scaffold into main`

## TDD Gate Compliance

Task 1 followed RED/GREEN: the fixture + tests were committed first (`test(12-03): …`)
with the engine modules missing, verified to fail (`Cannot find module '../engine/copy.js'`),
then the GREEN commit (`feat(12-03): implement engine copy, render, and env modules`)
added the implementations and all 42 tests passed. No refactor commit was required.

Task 2 is an orchestration layer exercised end-to-end by the existing
fixture-driven tests (copy + render + env) plus manual CLI verification.
No additional unit tests were added for `installDeps` / `initGit` /
`scaffold` because they drive subprocesses; integration coverage of
those paths lands in 12-08's CI smoke test.

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/src/engine/copy.ts`
- FOUND: `packages/create-uploadkit-app/src/engine/render.ts`
- FOUND: `packages/create-uploadkit-app/src/engine/env.ts`
- FOUND: `packages/create-uploadkit-app/src/engine/install.ts`
- FOUND: `packages/create-uploadkit-app/src/engine/git.ts`
- FOUND: `packages/create-uploadkit-app/src/engine/index.ts`
- FOUND: `packages/create-uploadkit-app/src/__tests__/engine.test.ts`
- FOUND: `packages/create-uploadkit-app/src/__fixtures__/mini-template/_gitignore`
- FOUND: `packages/create-uploadkit-app/src/__fixtures__/mini-template/package.json`
- FOUND: `packages/create-uploadkit-app/src/__fixtures__/mini-template/README.md`
- FOUND: `packages/create-uploadkit-app/templates/.gitkeep`
- FOUND commit: `79e8e79`
- FOUND commit: `f21d9b1`
- FOUND commit: `ef3c18b`
