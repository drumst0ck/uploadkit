---
phase: 12-create-uploadkit-app-cli
plan: 02
subsystem: create-uploadkit-app
tags: [cli, prompts, clack, mri, pm-detection]
requires:
  - "12-01 (package skeleton, build pipeline, mri/clack/picocolors already installed)"
provides:
  - "parseArgs(argv) → ParsedFlags (validated, non-throwing)"
  - "detectPm() → 'pnpm' | 'npm' | 'yarn' | 'bun'"
  - "runPrompts(parsed) → Promise<ResolvedOptions>"
  - "CancelledError (exitCode 130) for Ctrl+C"
  - "ResolvedOptions type contract for the template engine (12-03)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Tri-state boolean flag (--ts / --no-ts / absent) resolved by scanning argv directly; mri's boolean coercion is insufficient on its own"
    - "Clack cancel handling via isCancel + typed CancelledError, re-thrown up to main() which maps to exit 130"
    - "Prompt pre-selection uses detectPm() for the initialValue of the pm select"
key-files:
  created:
    - packages/create-uploadkit-app/src/args.ts
    - packages/create-uploadkit-app/src/pm.ts
    - packages/create-uploadkit-app/src/prompts.ts
    - packages/create-uploadkit-app/src/types.ts
    - packages/create-uploadkit-app/src/__tests__/args.test.ts
    - packages/create-uploadkit-app/src/__tests__/pm.test.ts
    - packages/create-uploadkit-app/src/__tests__/prompts.test.ts
  modified:
    - packages/create-uploadkit-app/src/index.ts
decisions:
  - "Non-vite templates always force typescript: true (honours D-07: next/sveltekit/remix ship TS-only)"
  - "--yes requires a positional project name; no positional + --yes is allowed and falls back to DEFAULT_NAME 'my-uploadkit-app'"
  - "Cancellation is surfaced as a thrown CancelledError (code CLI_CANCELLED, exitCode 130) rather than returning a tagged result, so prompts.ts can bail out immediately without threading status upward"
  - "args.ts accumulates validation errors into a string[] instead of throwing — keeps the function pure and lets index.ts format them with picocolors consistently"
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 02: Prompts, Arg Parsing, PM Detection — Summary

Turned the Wave 1 scaffold into an interactive CLI. The binary now parses every
flag documented in `--help`, auto-detects the package manager from
`npm_config_user_agent`, walks the user through six prompts (or skips them via
flags / `--yes`), and prints a fully-resolved `ResolvedOptions` JSON blob that
Plan 12-03's template engine will consume verbatim.

## What Landed

### Task 1 — `parseArgs` + `detectPm` (pure, unit-tested)

- `src/types.ts`: `TEMPLATE_IDS`, `PACKAGE_MANAGERS`, `TemplateId`, `PackageManager`,
  `ResolvedOptions`, `ParsedFlags`. Single source of truth for the contract
  between prompts and the rest of the CLI.
- `src/args.ts`: thin wrapper over `mri` with explicit `boolean`/`string`
  declarations, short aliases (`-t`, `-y`, `-h`, `-v`), and validation against
  the allowed template / pm tuples. Invalid values accumulate on
  `errors: string[]` — never thrown.
- `src/pm.ts`: `detectPm()` parses the first whitespace-delimited token of
  `npm_config_user_agent`. Maps `pnpm/*` / `yarn/*` / `bun/*` / `npm/*`.
  Falls back to `'pnpm'` (monorepo default, D-05) when the env var is
  missing or unrecognised.

### Task 2 — `runPrompts` + CLI wiring

- `src/prompts.ts`:
  - Prompt order: name → template → pm → (TypeScript if vite) → install → git.
  - Any flag short-circuits its prompt.
  - `--yes` skips everything; required fields fall back to sensible defaults
    (`next` template, `detectPm()` for pm, `DEFAULT_NAME = my-uploadkit-app`
    when no positional).
  - `--force` bypasses the "target dir is non-empty" validation.
  - Name sanitisation (`sanitizeName`): lowercases, replaces illegal chars
    with `-`, collapses repeated `-`, strips leading `-_`.
  - Typescript rule: only `vite` honours `--ts` / `--no-ts`. Other templates
    force `typescript: true` — matches D-07 (next/sveltekit/remix ship TS-only).
  - Ctrl+C at any prompt throws `CancelledError { code: 'CLI_CANCELLED', exitCode: 130 }`.
- `src/index.ts` rewrite:
  - Uses `parseArgs` + `p.intro`/`p.outro`.
  - Handles `--version`, `--help`, and `parsed.errors` before entering the
    prompt flow.
  - Catches `CancelledError`, prints `✖ Cancelled.` in yellow via `picocolors`,
    exits 130. Other errors propagate to the top-level catch.
  - Prints resolved options JSON for manual verification; Wave 3 replaces
    that echo with a template-engine call.

## Prompt Order & Defaults

| # | Prompt | Skipped when | Default / pre-selected |
|---|--------|--------------|-----------------------|
| 1 | project name (text) | positional arg provided or `--yes` | `my-uploadkit-app` |
| 2 | template (select)   | `--template <id>` or `--yes`     | `next`             |
| 3 | package manager (select) | `--pm <id>` or `--yes`        | `detectPm()` result|
| 4 | TypeScript (confirm) | template ≠ vite, `--ts`/`--no-ts`, or `--yes` | `true` |
| 5 | install deps (confirm) | `--no-install` or `--yes`       | `true`             |
| 6 | git init (confirm)    | `--no-git` or `--yes`            | `true`             |

## Detected-PM Fallback Behavior

- `npm_config_user_agent` starts with `pnpm/` → `pnpm`
- starts with `yarn/` → `yarn`
- starts with `bun/` → `bun`
- starts with `npm/` → `npm`
- missing / unknown (e.g. `deno/*`) → `pnpm` (D-05)

The interactive flow **always** shows the pm prompt with the detected value as
`initialValue` — the user can override with one keypress. `--pm <id>` skips
the prompt entirely.

## Flag Name Changes

None. Implemented exactly the flags enumerated in the plan's `must_haves`:
`--template`, `--pm`, `--yes`, `--no-install`, `--ts`, plus the bonus
`--no-git` and `--force` explicitly called out in the plan body (tasks).

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter create-uploadkit-app typecheck` | passes |
| `pnpm --filter create-uploadkit-app test` | 4 files / 31 tests pass |
| `pnpm --filter create-uploadkit-app build` | ESM 8.48 KB, CJS 10.57 KB |
| `node dist/index.js test-app --template next --pm pnpm --yes` | prints ResolvedOptions JSON (see below) |
| `node dist/index.js vite-app --template vite --pm npm --yes` | `typescript: true` (default for vite with no explicit --ts) |
| `node dist/index.js --template foo` | `error Unknown --template "foo". Expected one of: next, sveltekit, remix, vite.` (exit 1) |
| `node dist/index.js --help` | lists every flag from the table above |

Sample --yes output:

```json
{
  "name": "test-app",
  "projectDir": "/private/tmp/test-app",
  "template": "next",
  "pm": "pnpm",
  "typescript": true,
  "install": true,
  "gitInit": true
}
```

## Deviations from Plan

None. Every `must_haves.truths` item is covered by a passing test, and every
`artifacts` path exists with the stated exports.

## Deferred Issues

### eslint `dist/` ignore mis-scoped under per-package `pnpm --filter ... lint`

Logged to `.planning/phases/12-create-uploadkit-app-cli/deferred-items.md`.

Running `pnpm --filter create-uploadkit-app lint` surfaces 44 `no-undef` /
unused-vars errors inside `dist/*.js`/`dist/*.cjs` because the root
`packages/config/eslint/index.js` uses `ignores: ['dist/']`, which resolves
relative to the config location rather than the package cwd. This is
pre-existing (12-01 never ran `lint` and its summary doesn't mention it)
and out of scope for this plan, whose verification script is `test` not
`lint`. Recommended fix: add `**/dist/**` variants to the shared ignore
block in 12-08 (publish/CI) — a single-line change that benefits every
workspace package.

## Known Stubs

- `src/index.ts` still prints the resolved options JSON instead of invoking
  the template engine. That is intentional and explicitly called out in the
  plan (`Wave 3 will hand them to the template engine`). Plan 12-03 replaces
  the `p.outro(...) + JSON.stringify` block with a call into `src/engine/`.

## Commits

- `3ab2a98` — `test(12-02): add failing tests for args parsing and pm detection`
- `63277d4` — `feat(12-02): implement argument parsing and package-manager detection`
- `191b979` — `test(12-02): add failing tests for interactive prompts`
- `0683717` — `feat(12-02): add interactive prompts and wire into CLI main`

## TDD Gate Compliance

Both tasks followed the RED/GREEN cycle with explicit test-only commits
(`test(12-02): …`) preceding their `feat(12-02): …` implementation commits.
No refactor commits were needed.

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/src/types.ts`
- FOUND: `packages/create-uploadkit-app/src/args.ts`
- FOUND: `packages/create-uploadkit-app/src/pm.ts`
- FOUND: `packages/create-uploadkit-app/src/prompts.ts`
- FOUND: `packages/create-uploadkit-app/src/__tests__/args.test.ts`
- FOUND: `packages/create-uploadkit-app/src/__tests__/pm.test.ts`
- FOUND: `packages/create-uploadkit-app/src/__tests__/prompts.test.ts`
- FOUND commit: `3ab2a98`
- FOUND commit: `63277d4`
- FOUND commit: `191b979`
- FOUND commit: `0683717`
