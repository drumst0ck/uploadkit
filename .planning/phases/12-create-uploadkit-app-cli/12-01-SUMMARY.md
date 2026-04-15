---
phase: 12-create-uploadkit-app-cli
plan: 01
subsystem: create-uploadkit-app
tags: [cli, scaffold, tsup, foundation]
requires: []
provides:
  - "packages/create-uploadkit-app workspace package"
  - "tsup ESM+CJS build with Node shebang banner"
  - "bin entry create-uploadkit-app"
  - "--version and --help flags"
affects: [pnpm-workspace.yaml]
tech-stack:
  added:
    - "@clack/prompts@1.2.0"
    - "mri@1.2.0"
    - "picocolors@1.1.1"
    - "execa@9.6.1"
  patterns:
    - "tsup banner callback to inject #!/usr/bin/env node on ESM only"
    - "UPLOADKIT_CLI_SKIP_MAIN env guard so tests can import the CLI module"
key-files:
  created:
    - packages/create-uploadkit-app/package.json
    - packages/create-uploadkit-app/tsconfig.json
    - packages/create-uploadkit-app/tsup.config.ts
    - packages/create-uploadkit-app/vitest.config.ts
    - packages/create-uploadkit-app/.npmignore
    - packages/create-uploadkit-app/README.md
    - packages/create-uploadkit-app/src/index.ts
    - packages/create-uploadkit-app/src/version.ts
    - packages/create-uploadkit-app/src/index.test.ts
  modified: []
decisions:
  - "Unscoped npm name 'create-uploadkit-app' per D-01 (required for npm/pnpm/yarn/bun create shortcuts)"
  - "Local vitest.config.ts so `pnpm --filter create-uploadkit-app test` resolves test files when cwd is the package"
  - "Top-level main() auto-runs only when UPLOADKIT_CLI_SKIP_MAIN is unset — keeps a single bin entry while allowing safe test imports"
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 01: Package Skeleton + Build Pipeline — Summary

Established the publishable `create-uploadkit-app` workspace package with a tsup-powered ESM+CJS build that emits a runnable `dist/index.js` with a `#!/usr/bin/env node` shebang. The CLI parses flags with `mri`, honours `--version` / `-v` and `--help` / `-h`, and prints a "run again from Wave 2" placeholder for any other invocation so later waves can layer prompts/templates on top without fighting tooling.

## What Landed

### Task 1 — Package skeleton
- `package.json` with unscoped name, `type: "module"`, `bin`, `files: ["dist","templates"]`, `publishConfig.access: "public"`, `engines.node: ">=20"`, and scripts `build`, `dev`, `typecheck`, `lint`, `test`.
- Runtime deps installed at `@latest` per CLAUDE.md: `@clack/prompts@1.2.0`, `mri@1.2.0`, `picocolors@1.1.1`, `execa@9.6.1`.
- Dev deps at `@latest`: `tsup@8.5.1`, `typescript`, `vitest`, `@types/node`, plus `@uploadkitdev/config` as `workspace:*`.
- `tsconfig.json` extends `@uploadkitdev/config/typescript/library` and sets `noEmit: true` (tsup does the emit).
- `tsup.config.ts` emits ESM + CJS targeting `node20`, injects `#!/usr/bin/env node` banner on the ESM output only, `dts: false` (no types to publish for a bin), `clean: true`.
- `.npmignore` excludes sources/config; `README.md` documents usage across all four package managers.
- `pnpm-workspace.yaml` already covered `packages/*` — no edit required.

### Task 2 — Entry point with --version / --help
- `src/version.ts` exports a `VERSION` constant (real injection wired in 12-08 per the plan).
- `src/index.ts` parses argv with `mri`, handles `--version`/`-v`, `--help`/`-h`, and falls through to a "run again from Wave 2" message. Top-level `main()` promise has a catch that prints errors with `picocolors.red` and exits 1.
- Auto-run is guarded by `UPLOADKIT_CLI_SKIP_MAIN` so Vitest can import the module without the CLI firing `process.exit`.
- `HELP_TEXT` lists all four template names (`next`, `sveltekit`, `remix`, `vite`) so the Vitest test can assert they are all referenced.
- Local `vitest.config.ts` so `pnpm --filter create-uploadkit-app test` resolves test files relative to the package cwd (root config uses `packages/*/src/**/*.test.ts` which fails when pnpm changes cwd into the package).

## Verification

| Check | Result |
|-------|--------|
| `pnpm install` | clean |
| `pnpm --filter create-uploadkit-app typecheck` | passes |
| `pnpm --filter create-uploadkit-app build` | ESM 1.82 KB, CJS 3.66 KB |
| `head -1 dist/index.js` | `#!/usr/bin/env node` |
| `node dist/index.js --version` | `0.0.0` |
| `node dist/index.js --help` | prints usage, mentions all 4 templates |
| `pnpm --filter create-uploadkit-app test` | 2 tests pass |
| `pnpm ls -r` | includes `create-uploadkit-app@0.0.0` |

## Deviations from Plan

**1. [Rule 3 — Blocking] Added `vitest.config.ts` inside the package.**
- **Found during:** Task 2 verification.
- **Issue:** The root `vitest.config.ts` uses `include: ['packages/*/src/**/*.test.ts']`, which is evaluated relative to the current working directory. When pnpm runs `vitest run` with cwd set to the package folder, that glob matches nothing and Vitest exits with code 1.
- **Fix:** Added `packages/create-uploadkit-app/vitest.config.ts` with `include: ['src/**/*.test.ts','tests/**/*.test.ts']`, matching the pattern already used by `packages/shared`.
- **Commit:** `ccb7a69`

**2. [Rule 2 — Missing critical functionality] `UPLOADKIT_CLI_SKIP_MAIN` env guard on auto-run.**
- **Found during:** Task 2 test authoring.
- **Issue:** The plan asks for a CLI bin plus a Vitest test that imports `HELP_TEXT`. If `src/index.ts` unconditionally calls `main().then(process.exit)`, importing it during tests kills the Vitest worker.
- **Fix:** Gate the auto-run with `if (!process.env.UPLOADKIT_CLI_SKIP_MAIN)`; the test sets the env var before the dynamic `await import(...)`. Dist/bin behaviour is unchanged (the var is never set in production).
- **Commit:** `ccb7a69`

**3. `tsconfig.json` sets `noEmit: true`.**
- The extended library preset declares `declaration: true`. Since tsup handles the actual emit and `dts: false` is set, `tsc --noEmit` is sufficient for the typecheck script. This matches how other tsup-built packages (`packages/core`) operate.

## Known Stubs

- `src/version.ts` hard-codes `VERSION = '0.0.0'`. The plan explicitly defers real version injection to Plan 12-08 (publish/CI), so this is an intentional stub and not a gap.
- `src/index.ts` prints `"run again from Wave 2"` for any non-`--version`/`--help` invocation. Wave 2 (Plans 12-02 and 12-03) replaces this with prompts and the template engine.

## Commits

- `cf744ba` — `feat(12-01): scaffold create-uploadkit-app package skeleton`
- `ccb7a69` — `feat(12-01): add CLI entry point with --version and --help`

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/package.json`
- FOUND: `packages/create-uploadkit-app/tsconfig.json`
- FOUND: `packages/create-uploadkit-app/tsup.config.ts`
- FOUND: `packages/create-uploadkit-app/src/index.ts`
- FOUND: `packages/create-uploadkit-app/src/version.ts`
- FOUND: `packages/create-uploadkit-app/src/index.test.ts`
- FOUND: `packages/create-uploadkit-app/vitest.config.ts`
- FOUND: `packages/create-uploadkit-app/.npmignore`
- FOUND: `packages/create-uploadkit-app/README.md`
- FOUND commit: `cf744ba`
- FOUND commit: `ccb7a69`
