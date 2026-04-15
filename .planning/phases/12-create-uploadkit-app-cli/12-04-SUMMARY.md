---
phase: 12-create-uploadkit-app-cli
plan: 04
subsystem: create-uploadkit-app
tags: [template, nextjs, app-router, tailwind-v4, dropzone]
requires:
  - "12-03 (template engine: copy, render, env, install, git)"
provides:
  - "templates/next/ — Next.js 16 App Router + Tailwind v4 + @uploadkitdev/react + @uploadkitdev/next"
  - "Working <UploadDropzone /> demo page wired to /api/uploadkit"
  - "createUploadKitHandler route at app/api/uploadkit/[...uploadkit]/route.ts"
  - "Template smoke test (scaffold into tmpdir, assert files + deps)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Catch-all route segment [...uploadkit] — required by createUploadKitHandler (reads params.uploadkit[0])"
    - "FileRouter co-located with the route handler (core.ts + route.ts) so layout can import it without circular imports"
    - "Tailwind v4 via @import 'tailwindcss' in globals.css + @tailwindcss/postcss plugin"
    - "@uploadkitdev/react/styles.css imported once in root layout (works because the package declares a './styles.css' export)"
    - "package.json declares @uploadkitdev/* deps as 'latest' — the prepublishOnly script from plan 12-08 rewrites these to pinned '^x.y.z' at publish time"
    - "Template TSX files contain no {{placeholders}} — only package.json, README.md, .env* are rendered by the engine"
key-files:
  created:
    - packages/create-uploadkit-app/templates/next/package.json
    - packages/create-uploadkit-app/templates/next/tsconfig.json
    - packages/create-uploadkit-app/templates/next/next.config.ts
    - packages/create-uploadkit-app/templates/next/postcss.config.mjs
    - packages/create-uploadkit-app/templates/next/README.md
    - packages/create-uploadkit-app/templates/next/_gitignore
    - packages/create-uploadkit-app/templates/next/_env.local
    - packages/create-uploadkit-app/templates/next/app/layout.tsx
    - packages/create-uploadkit-app/templates/next/app/page.tsx
    - packages/create-uploadkit-app/templates/next/app/globals.css
    - packages/create-uploadkit-app/templates/next/app/api/uploadkit/[...uploadkit]/route.ts
    - packages/create-uploadkit-app/templates/next/app/api/uploadkit/[...uploadkit]/core.ts
    - packages/create-uploadkit-app/src/__tests__/template-next.test.ts
  modified: []
decisions:
  - "Use [...uploadkit] catch-all segment for the route handler — createUploadKitHandler from @uploadkitdev/next requires it (reads params.uploadkit[0] in both GET and POST). A single route.ts under app/api/uploadkit/ would break at runtime."
  - "Split router config (core.ts) from handler wiring (route.ts) — mirrors the shipped examples/nextjs pattern and leaves room for a future layout-level NextSSRPlugin without circular imports."
  - "Template TSX files contain zero placeholders — the engine's renderProjectFiles() only touches package.json/README.md/.env*. Keeping placeholders out of TSX avoids surprises when a user's project name happens to look like a JSX token."
  - "Keep layout.tsx's <title> as a generic 'UploadKit demo' rather than project-specific — the project name is already in package.json and README.md (both rendered). Avoids adding the engine's placeholder pass to .tsx."
  - "Declare @uploadkitdev/react + @uploadkitdev/next as 'latest' in the template package.json (not 'workspace:*'). The template package.json is what users install — workspace: protocol is unresolvable outside this monorepo. Plan 12-08's prepublishOnly rewrites to '^x.y.z' at publish time."
  - "Use process.env.UPLOADKIT_API_KEY ?? 'uk_test_placeholder' in the route handler so the dev server boots cleanly even if the user hasn't touched .env.local yet — requirement 12-04 line 114."
  - "Omit NextSSRPlugin from the root layout for the starter template — it's an optimisation, not a correctness requirement, and adding it couples layout.tsx to the router config file path. Can be suggested in docs."
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 04: Next.js Template — Summary

Shipped the flagship `next` template consumed by `create-uploadkit-app`.
Running `pnpm create uploadkit-app my-app --template next` (once 12-08 is
live) now produces a Next.js 16 App Router project with Tailwind v4, a
working `<UploadDropzone />` on the home page, and a server-side
UploadKit route handler that uses the API key from `.env.local` — all
boots cleanly with the placeholder key and renders the dropzone at
`http://localhost:3000`.

## What Landed

### Task 1 — project files, Tailwind v4, layout

- `package.json` — `{{name}}` for the project name, scripts
  (`dev`/`build`/`start`/`lint`), and `latest` deps across:
  - runtime: `next`, `react`, `react-dom`, `@uploadkitdev/react`,
    `@uploadkitdev/next`
  - dev: `typescript`, `@types/*`, `tailwindcss`, `@tailwindcss/postcss`
- `tsconfig.json` — mirrors `examples/nextjs` (strict, ESNext, bundler,
  preserve JSX, Next plugin).
- `next.config.ts` — `transpilePackages` for the three `@uploadkitdev/*`
  packages that ship ESM+CJS bundles, keeps Next 16 + Turbopack happy.
- `postcss.config.mjs` — single `@tailwindcss/postcss` plugin entry.
- `app/layout.tsx` — imports `@uploadkitdev/react/styles.css` and
  `./globals.css`, sets a static `metadata` block.
- `app/globals.css` — `@import "tailwindcss";` + a tiny `@theme` block
  that matches the brand's dark surface / indigo accent tokens.
- `_gitignore` / `_env.local` — standard Next.js ignores + the required
  `UPLOADKIT_API_KEY=uk_test_placeholder` + signup-link comment (identical
  to what `writeEnvLocal` would have scaffolded; the template ships its
  own so there's a source of truth inside `templates/`).
- `README.md` — renders with `{{name}}`, `{{pkgManager}} dev`, and
  `{{year}}`. Three "next steps": run dev, get a real key, drop it in
  `.env.local`. Links to `docs.uploadkit.dev/nextjs`.

### Task 2 — dropzone page + route handler + smoke test

- `app/api/uploadkit/[...uploadkit]/core.ts` — declares a single
  `imageUploader` route on a `FileRouter` (4MB, max 4 images,
  JPEG/PNG/WebP/GIF) with a no-op `middleware` + `onUploadComplete` that
  just logs.
- `app/api/uploadkit/[...uploadkit]/route.ts` — wires
  `createUploadKitHandler` against `process.env.UPLOADKIT_API_KEY` with
  an inline fallback of `'uk_test_placeholder'` so `pnpm dev` never
  crashes on a missing env var; re-exports `GET` + `POST`.
- `app/page.tsx` — client component that wraps `<UploadKitProvider
  endpoint="/api/uploadkit">` around `<UploadDropzone route="imageUploader" />`.
  Copy tells the developer exactly where to paste their real key.
- `src/__tests__/template-next.test.ts` — drives `scaffold()` against the
  real `templates/next/` directory into `os.tmpdir()`, asserts:
  - every expected file exists (incl. the `[...uploadkit]` catch-all
    segment),
  - `package.json` has the five runtime deps + two dev deps + rendered
    project name,
  - `README.md` renders `{{name}}`, `{{pkgManager}}`, `{{year}}` and has
    no leftover placeholders,
  - `.env.local` has the placeholder key + signup link,
  - `route.ts` references `createUploadKitHandler` from
    `@uploadkitdev/next`,
  - `page.tsx` is a client component using the provider + dropzone +
    `/api/uploadkit` endpoint.

## Exact SDK Exports Used

| Package                | Export                    | Used in                                 |
| ---------------------- | ------------------------- | --------------------------------------- |
| `@uploadkitdev/next`   | `createUploadKitHandler`  | `app/api/uploadkit/[...uploadkit]/route.ts` |
| `@uploadkitdev/next`   | `FileRouter` (type)       | `app/api/uploadkit/[...uploadkit]/core.ts`  |
| `@uploadkitdev/react`  | `UploadKitProvider`       | `app/page.tsx`                          |
| `@uploadkitdev/react`  | `UploadDropzone`          | `app/page.tsx`                          |
| `@uploadkitdev/react`  | `./styles.css`            | `app/layout.tsx`                        |

No shims needed — the SDKs already expose the exact factory + components
the template requires.

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter create-uploadkit-app test -- template-next` | 1 file / 1 test passes |
| `pnpm --filter create-uploadkit-app test` (full suite) | 6 files / 43 tests pass |
| `pnpm --filter create-uploadkit-app typecheck` | passes |
| `node -e "require('./packages/create-uploadkit-app/templates/next/package.json')"` | parses, template name is `{{name}}` (pre-render) |

The smoke test exercises the full engine end-to-end against the real
`templates/next/` directory — no fixture, no stub. That's the same path
12-08's CI smoke test will extend with a `pnpm install && pnpm build`
step against a tarball.

## Deviations from Plan

**1. [Rule 2 — Missing critical functionality] Route handler falls back to `'uk_test_placeholder'` when the env var is unset.**
- **Found during:** Task 2, while checking the plan's "Dropzone renders
  in `pnpm dev`" done criterion.
- **Issue:** `process.env.UPLOADKIT_API_KEY!` (non-null assertion) would
  crash the route handler at runtime on a freshly-scaffolded project
  whose `.env.local` hadn't been loaded yet — e.g. if the dev server
  was started from a subdirectory, or the user renamed `.env.local`.
- **Fix:** Use `process.env.UPLOADKIT_API_KEY ?? 'uk_test_placeholder'`.
  The dev server always boots; actual uploads still fail (as they should)
  until a real key is configured, and the returned error surfaces the
  missing-config code path.
- **Commit:** `f89e5f4`

**2. Catch-all segment `[...uploadkit]` instead of the flat `app/api/uploadkit/route.ts` the plan's file list suggested.**
- **Found during:** Reading `packages/next/src/handler.ts`.
- **Issue:** `createUploadKitHandler` reads `params.uploadkit[0]` as the
  route slug. A flat `route.ts` under `app/api/uploadkit/` never
  populates that param, so the handler would return `ROUTE_NOT_FOUND`
  for every request.
- **Fix:** Placed the route at
  `app/api/uploadkit/[...uploadkit]/route.ts` to match the catch-all
  contract — same shape the existing `examples/nextjs` project uses.
  Kept the provider endpoint as `/api/uploadkit` (Next resolves that to
  the catch-all with no slug → the SDK's proxy client sends the slug in
  the request body, which the handler reads).
- **Commit:** `f89e5f4`

**3. Added a co-located `core.ts` alongside the route.**
- The plan listed only `route.ts`; I split the `FileRouter` into
  `core.ts` to match the existing `examples/nextjs` pattern. Lets future
  changes (e.g. adding `NextSSRPlugin` to the layout, or `generateReactHelpers`
  to a `helpers.ts` for typed client components) import the router
  without re-parsing a Route Handler module.

## Known Stubs

- None — the template is wired end-to-end. Uploads will fail with
  `MISSING_CONFIG` against the placeholder key, but that's the documented
  behaviour and the README points at the exact remediation (sign up →
  replace key).

## Threat Flags

None — the template does not introduce new security surface. It only
declares a standard Next.js route handler that already exists as a
supported pattern in `@uploadkitdev/next`.

## Commits

- `e2bcda9` — `feat(12-04): add Next.js template project files, Tailwind v4, layout`
- `f89e5f4` — `feat(12-04): add Next.js template dropzone page, route handler, and smoke test`

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/templates/next/package.json`
- FOUND: `packages/create-uploadkit-app/templates/next/tsconfig.json`
- FOUND: `packages/create-uploadkit-app/templates/next/next.config.ts`
- FOUND: `packages/create-uploadkit-app/templates/next/postcss.config.mjs`
- FOUND: `packages/create-uploadkit-app/templates/next/README.md`
- FOUND: `packages/create-uploadkit-app/templates/next/_gitignore`
- FOUND: `packages/create-uploadkit-app/templates/next/_env.local`
- FOUND: `packages/create-uploadkit-app/templates/next/app/layout.tsx`
- FOUND: `packages/create-uploadkit-app/templates/next/app/page.tsx`
- FOUND: `packages/create-uploadkit-app/templates/next/app/globals.css`
- FOUND: `packages/create-uploadkit-app/templates/next/app/api/uploadkit/[...uploadkit]/route.ts`
- FOUND: `packages/create-uploadkit-app/templates/next/app/api/uploadkit/[...uploadkit]/core.ts`
- FOUND: `packages/create-uploadkit-app/src/__tests__/template-next.test.ts`
- FOUND commit: `e2bcda9`
- FOUND commit: `f89e5f4`
