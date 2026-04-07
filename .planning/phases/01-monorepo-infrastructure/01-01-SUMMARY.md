---
phase: 01-monorepo-infrastructure
plan: "01"
subsystem: monorepo
tags: [turborepo, pnpm, typescript, tailwind, eslint, scaffolding]
dependency_graph:
  requires: []
  provides:
    - Turborepo + pnpm workspace monorepo skeleton
    - packages/config (ESLint flat config, TypeScript base/nextjs/library, Tailwind v4 base.css)
    - apps/api, apps/dashboard, apps/web, apps/docs (Next.js 16 stubs)
    - packages/core, packages/react, packages/next (public SDK skeletons)
    - packages/ui (internal shadcn/ui placeholder)
    - Root .env.example, .gitignore, .npmrc, turbo.json, vitest.config.ts
  affects:
    - All subsequent plans depend on this workspace structure
tech_stack:
  added:
    - turbo@2.9.5
    - pnpm@10.26.2 (workspace)
    - typescript@6.0.2
    - next@16.2.2
    - tailwindcss@4.2.2
    - tsup@8.5.1
    - vitest@4.1.3
    - "@changesets/cli@2.30.0"
  patterns:
    - Turborepo pipeline with ^build dependency order
    - Tailwind v4 CSS-first config via @theme (no tailwind.config.js)
    - TypeScript strict mode with exactOptionalPropertyTypes and noUncheckedIndexedAccess
    - tsup dual ESM+CJS output with DTS for all SDK packages
    - Single root .env.example as source of truth for all env vars
key_files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - turbo.json
    - .env.example
    - .gitignore
    - .npmrc
    - vitest.config.ts
    - packages/config/package.json
    - packages/config/eslint/index.js
    - packages/config/typescript/tsconfig.base.json
    - packages/config/typescript/tsconfig.nextjs.json
    - packages/config/typescript/tsconfig.library.json
    - packages/config/tailwind/base.css
    - apps/api/package.json
    - apps/api/next.config.ts
    - apps/api/tsconfig.json
    - apps/api/src/app/layout.tsx
    - apps/api/src/app/page.tsx
    - apps/api/src/app/globals.css
    - apps/dashboard/package.json
    - apps/dashboard/next.config.ts
    - apps/dashboard/tsconfig.json
    - apps/dashboard/src/app/layout.tsx
    - apps/dashboard/src/app/page.tsx
    - apps/dashboard/src/app/globals.css
    - apps/web/package.json
    - apps/web/next.config.ts
    - apps/web/tsconfig.json
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/app/globals.css
    - apps/docs/package.json
    - apps/docs/next.config.ts
    - apps/docs/tsconfig.json
    - apps/docs/src/app/layout.tsx
    - apps/docs/src/app/page.tsx
    - packages/core/package.json
    - packages/core/tsup.config.ts
    - packages/core/tsconfig.json
    - packages/core/src/index.ts
    - packages/react/package.json
    - packages/react/tsup.config.ts
    - packages/react/tsconfig.json
    - packages/react/src/index.ts
    - packages/next/package.json
    - packages/next/tsup.config.ts
    - packages/next/tsconfig.json
    - packages/next/src/index.ts
    - packages/ui/package.json
    - packages/ui/tsconfig.json
    - packages/ui/src/index.ts
    - pnpm-lock.yaml
  modified:
    - packages/config/package.json (added tailwindcss dependency)
    - packages/config/typescript/tsconfig.base.json (added ignoreDeprecations 6.0)
decisions:
  - "tailwindcss added as direct dep of packages/config so @import tailwindcss resolves when apps consume base.css via workspace"
  - "ignoreDeprecations: 6.0 added to tsconfig.base.json for TypeScript 6 compatibility with tsup DTS build"
  - "types condition placed after import/require in SDK exports map (warning only, tooling handles it)"
  - "apps omit @uploadkit/shared and @uploadkit/db workspace refs since those packages are in plans 01-02 and 01-03"
metrics:
  duration: "4 minutes"
  completed: "2026-04-07T22:09:28Z"
  tasks_completed: 2
  files_created: 50
---

# Phase 01 Plan 01: Monorepo Skeleton, Workspace Config, Shared Configs Summary

Turborepo + pnpm workspaces monorepo with 4 Next.js 16 app stubs, 4 SDK package skeletons, and shared TypeScript strict / Tailwind v4 / ESLint flat configs — `pnpm install && pnpm build` passes across all 9 packages.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Root monorepo config and shared packages/config | 3052262 | package.json, pnpm-workspace.yaml, turbo.json, .env.example, .gitignore, .npmrc, packages/config/**, vitest.config.ts |
| 2 | All 4 apps and 4 SDK/UI package skeletons | c1e6cdc | apps/api, apps/dashboard, apps/web, apps/docs, packages/core, packages/react, packages/next, packages/ui, pnpm-lock.yaml |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added tailwindcss as direct dependency of packages/config**
- **Found during:** Task 2 — pnpm build
- **Issue:** When Next.js/Turbopack resolved `@import "@uploadkit/config/tailwind/base.css"`, it processed the CSS in the context of `packages/config`. Since `tailwindcss` was only in the apps' devDependencies (not in config), the `@import "tailwindcss"` inside base.css failed with "Module not found: Can't resolve 'tailwindcss'"
- **Fix:** Added `"tailwindcss": "latest"` to `packages/config/package.json` dependencies
- **Files modified:** packages/config/package.json
- **Commit:** c1e6cdc

**2. [Rule 1 - Bug] Added ignoreDeprecations: "6.0" to tsconfig.base.json**
- **Found during:** Task 2 — tsup DTS build for packages/core
- **Issue:** TypeScript 6.0 deprecates `baseUrl` (tsup's DTS worker injects it temporarily). Build failed with `error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`
- **Fix:** Added `"ignoreDeprecations": "6.0"` to tsconfig.base.json compilerOptions
- **Files modified:** packages/config/typescript/tsconfig.base.json
- **Commit:** c1e6cdc

## Known Stubs

| File | Description |
|------|-------------|
| packages/core/src/index.ts | `export const VERSION = '0.1.0'` — implementation in Phase 4 |
| packages/react/src/index.ts | `export const VERSION = '0.1.0'` — components in Phase 5 |
| packages/next/src/index.ts | `export const VERSION = '0.1.0'` — adapter in Phase 4 |
| packages/ui/src/index.ts | `export {}` — shadcn/ui primitives in Phase 2 |
| apps/*/src/app/page.tsx | Minimal `<h1>` pages — content in future phases |

These stubs are intentional per the plan's scope. Each has a designated future plan.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-01-01: .env secrets committed | .gitignore includes `.env`, `.env.local`, `.env.*.local`; .env.example contains no real secrets |
| T-01-02: src/ in npm tarball | All SDK packages (core, react, next) have `"files": ["dist"]` |
| T-01-03: lockfile tampering | pnpm-lock.yaml generated and committed; CI should use --frozen-lockfile |

## Self-Check: PASSED

Files verified:
- package.json: FOUND
- turbo.json: FOUND
- pnpm-workspace.yaml: FOUND
- packages/config/typescript/tsconfig.base.json: FOUND (strict: true, ignoreDeprecations: "6.0")
- packages/config/tailwind/base.css: FOUND (@theme present)
- .env.example: FOUND (MONGODB_URI present)
- apps/dashboard/next.config.ts: FOUND (output: standalone)
- apps/dashboard/src/app/globals.css: FOUND (@import config/tailwind)
- packages/core/package.json: FOUND (sideEffects: false, files: ["dist"])

Commits verified:
- 3052262: Task 1 — chore(01-01): scaffold monorepo root config and shared packages/config
- c1e6cdc: Task 2 — feat(01-01): scaffold all 4 apps and 4 SDK package skeletons

Build verification: `pnpm install && pnpm build` — 7 successful, 0 failed (Tasks: 7 successful, 7 total)
