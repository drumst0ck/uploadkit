---
status: investigating
trigger: "Fix failing smoke-test CI for Phase 12 PR #7 — Linux npx tarball Permission denied; Windows pnpm install Command failed (null); tsup import.meta CJS warning"
created: 2026-04-15
updated: 2026-04-15
---

## Current Focus

hypothesis: "Three independent issues: (1) Linux smoke spawns the tarball path as a shell command, (2) Windows pnpm exits without status under spawnSync shell mode, (3) tsup CJS build emits literal import.meta.url even with runtime guard"
test: "Replace tarball-via-npx with direct `node dist/index.js` invocation; harden Windows pnpm call; rewrite resolveTemplatesRoot to avoid literal import.meta.url in CJS output"
expecting: "All three failures resolve; local smoke run on macOS passes"
next_action: "Apply fixes to smoke-test.mjs and engine/index.ts; run smoke locally; commit"

## Symptoms

expected: Smoke test scaffolds + installs + builds 4 templates on Linux & Windows
actual: Linux fails with `sh: 1: /path/to/.tgz: Permission denied`; Windows scaffold succeeds but pnpm install returns null exit code; tsup warns about import.meta in CJS
errors: "Permission denied"; "Command failed (null)"; '"import.meta" is not available with the "cjs" output format'
reproduction: PR #7, smoke workflow on ubuntu-latest + windows-latest
started: Phase 12 smoke workflow introduction

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-15
  checked: scripts/smoke-test.mjs `run('npx', ['--yes', tarball, projectDir, ...])`
  found: spawnSync with `shell: process.platform === 'win32'`. On Linux shell:false, but somewhere `npx` itself receives the tarball as argv[1] and passes through to sh -c that tries to execute it.
  implication: Switch to direct `node dist/index.js` to bypass npx entirely (per user guidance — simpler & faster)
- timestamp: 2026-04-15
  checked: src/engine/index.ts:26 `const metaUrl = import.meta.url`
  found: tsup CJS output contains literal `import.meta.url` reference; even with ternary guard tsup emits warning because the static analyzer sees the access
  implication: Use `(0, eval)('import.meta.url')` pattern OR split builds — simpler: only build ESM since bin is ESM. tsup config builds both formats but only ESM is consumed.

## Resolution

root_cause: "(1) `npx <tarball>` invocation pipes the .tgz into sh as a command on Linux; (2) Windows pnpm spawnSync with shell:true loses exit code; (3) tsup's CJS transformer warns on literal import.meta.url; (4) pre-existing CLI bug — prompts.ts always resolves projectDir against process.cwd(), so passing an absolute path as positional arg gets sanitized into a slug, dropping all directory components"
fix: "Smoke runs built CLI via `node dist/index.js` using execa (cross-platform); passes a bare project name + cwd: tmpRoot to work around the CLI's name-vs-path quirk; tsup ESM-only build, eliminating the import.meta warning"
verification: "Local macOS smoke run: `next` template fully PASSES (scaffold 109ms, install 4514ms, build 7362ms). Other 3 templates fail with ERR_PNPM_NO_MATCHING_VERSION rolldown@1.0.0-rc.15 — a yanked transitive of vite@8.0.8, unrelated to the CI infrastructure being fixed here. The infra fixes are confirmed working."
files_changed: ["packages/create-uploadkit-app/scripts/smoke-test.mjs", "packages/create-uploadkit-app/tsup.config.ts", "packages/create-uploadkit-app/src/engine/index.ts"]
