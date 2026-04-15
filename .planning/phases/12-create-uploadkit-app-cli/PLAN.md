---
phase: 12-create-uploadkit-app-cli
type: phase-overview
goal: "npx create-uploadkit-app <name> scaffolds a runnable project in <60s across 4 templates (Next.js, SvelteKit, Remix, Vite) with working uploads out of the box"
requirements: [GROW-01, GROW-02, GROW-03]
depends_on: [04-sdk-core-next-js-adapter, 05-sdk-react-components]
plans: 8
---

# Phase 12 — `create-uploadkit-app` CLI

## Goal
A `npx create-uploadkit-app my-app` command that in <60 seconds produces a
runnable project across four templates (Next.js, SvelteKit, Remix/React
Router v7, Vite), with auto-detected package manager, interactive prompts,
a pre-filled `.env.local`, and a template-specific README that tells the
developer exactly what to do next.

## Scope

### In scope
- Monorepo package `packages/create-uploadkit-app/`
- TypeScript CLI bundled with tsup, published to npm as
  `create-uploadkit-app`
- Interactive prompts: project name, template, package manager,
  TypeScript (where applicable)
- Co-located templates (four): `next`, `sveltekit`, `remix`, `vite`
- `.env.local` scaffolded with `UPLOADKIT_API_KEY=uk_test_placeholder` and
  a comment link to `https://uploadkit.dev/signup`
- Per-template `README.md` with dev/build commands + "Next steps"
- Dependency install step (auto-runs, skippable via `--no-install`)
- Smoke test in CI that scaffolds each template and runs `build`
- Changesets integration

### Out of scope
- Non-JS templates (Python, Go, Rust)
- Post-publish template updates (templates are frozen per version)
- DB / auth / CI / Docker scaffolding inside generated projects
- An "add a component" subcommand (different phase)
- A GitHub-sourced template registry (co-located only)

## Architecture Decisions
Summarised here; full rationale in `CONTEXT.md`.

| Decision | Choice |
|----------|--------|
| D-01 package location | `packages/create-uploadkit-app/`, unscoped npm name |
| D-02 prompt library | `@clack/prompts` + `mri` for flags |
| D-03 build | TypeScript + tsup (ESM primary, CJS fallback), Node 20+ |
| D-04 template strategy | Co-located, copied at runtime, `{{placeholder}}` render |
| D-05 PM detection | `npm_config_user_agent` → pnpm / npm / yarn / bun |
| D-06 SDK version pin | `prepublishOnly` rewrites template `package.json` to `^latest` |
| D-07 template content | Every template ships one working upload page, nothing else |
| D-08 release | Changesets + CI smoke test (scaffold + build each template) |

## Plan Breakdown

| Plan | Title | Requirements | Complexity |
|------|-------|--------------|------------|
| 12-01 | Package skeleton + build pipeline | GROW-01 | S |
| 12-02 | Prompts, arg parsing, PM detection | GROW-01, GROW-03 | M |
| 12-03 | Template engine (copy, render, install) | GROW-01, GROW-03 | M |
| 12-04 | Next.js template | GROW-02 | M |
| 12-05 | SvelteKit template | GROW-02 | M |
| 12-06 | React Router v7 (Remix) template | GROW-02 | M |
| 12-07 | Vite + React template | GROW-02 | S |
| 12-08 | Publish, Changesets, CI smoke test | GROW-01 | M |

## Wave Structure

```
Wave 1 (foundation):   12-01
Wave 2 (CLI runtime):  12-02, 12-03               (parallel, both depend on 01)
Wave 3 (templates):    12-04, 12-05, 12-06, 12-07 (parallel, depend on 03)
Wave 4 (release):      12-08                       (depends on all)
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Windows path handling (backslashes, drive letters) | Use `node:path` `posix`/`join` appropriately; test on `windows-latest` runner in CI smoke test |
| Slow `pnpm install` blows the <60s budget | Offer `--no-install` flag; budget check in smoke test uses `pnpm install --prefer-offline` in CI cache |
| Template drift from SDK changes | `prepublishOnly` pins to `^latest`; CI smoke test runs `build` per template on every release |
| Template size bloat inflates package | Exclude `node_modules`, `.next`, `.svelte-kit`, `dist` via `.npmignore`; measure with `pnpm pack --dry-run` (budget: <500KB total) |
| Package-manager detection misfires inside a monorepo | Prompt always shows detected PM with ability to override; fallback to `pnpm` then `npm` |
| Users run without internet (offline installs) | CLI prints guidance: if install step fails, the scaffolded project is still usable; user can run install later |
| `npm init uploadkit-app` expands to `create-uploadkit-app` only if name is unscoped | Enforced by D-01 |

## Success Criteria (phase-level, verifiable)

1. `npx create-uploadkit-app@<local-pack> demo --template next --pm pnpm --yes` completes in <60s on CI (Linux, warm pnpm cache)
2. `cd demo && pnpm build` succeeds for all four templates
3. Each scaffolded project renders a visible upload UI at `/` after `dev`
4. `.env.local` contains `UPLOADKIT_API_KEY=uk_test_placeholder` and a signup link comment
5. README per template has working dev/build/deploy commands and a "Next steps" section
6. Package published to npm and reachable via `npm init`, `pnpm create`, `yarn create`, `bun create` shortcuts
7. CI smoke test job is green on `master`
