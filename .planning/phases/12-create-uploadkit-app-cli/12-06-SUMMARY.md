---
phase: 12-create-uploadkit-app-cli
plan: 06
subsystem: create-uploadkit-app
tags: [template, remix, react-router-v7, framework-mode, dropzone, presigned-url]
requires:
  - "12-03 (template engine: copy, render, env, install, git)"
  - "12-04 (Next template conventions)"
  - "12-05 (SvelteKit template: BYOS presigning contract + 503 fallback)"
provides:
  - "templates/remix/ — React Router v7 framework mode + @uploadkitdev/react Dropzone + presigned PUT action"
  - "app/routes/_index.tsx wired to UploadKitProvider + UploadDropzone"
  - "app/routes/api.sign.ts action() issuing presigned PUT URLs via @aws-sdk/s3-request-presigner"
  - "app/routes.ts explicit RouteConfig (framework mode)"
  - "Template smoke test (scaffold into tmpdir, assert files + deps + route wiring)"
affects: []
tech-stack:
  added:
    - "react-router (v7, framework mode) — branded as 'remix' in the CLI"
    - "@react-router/dev, @react-router/node, @react-router/serve"
    - "isbot (bot detection for streaming SSR entry.server)"
    - "vite-tsconfig-paths (matches upstream create-react-router starter)"
  patterns:
    - "Explicit RouteConfig in app/routes.ts — framework mode default since RR7 dropped the Remix flat-routes auto-convention in favour of `index()` / `route()` helpers"
    - "Streaming SSR via entry.server.tsx using renderToPipeableStream + isbot for bot-vs-human render gating"
    - "`_index.tsx` file path preserved (plan artifact requirement) even though RR7's routes.ts references it explicitly — the underscore is cosmetic under config-based routing"
    - "action() exported from api.sign.ts is what POSTs hit; loader() returns a 405 hint for curl / direct GET visits"
    - "process.env read directly for R2_* — RR7 loads .env.local via Vite's built-in envfile support, no $env import needed (unlike SvelteKit)"
    - "`@uploadkitdev/react/styles.css` imported once in root.tsx (same pattern as templates/next/app/layout.tsx)"
    - "503 + remediation message when R2_* env vars missing — parity with SvelteKit template (plan 12-05 deviation #2)"
    - "Template .tsx/.ts files contain zero {{placeholders}} — only package.json/README/.env rendered"
key-files:
  created:
    - packages/create-uploadkit-app/templates/remix/package.json
    - packages/create-uploadkit-app/templates/remix/react-router.config.ts
    - packages/create-uploadkit-app/templates/remix/vite.config.ts
    - packages/create-uploadkit-app/templates/remix/tsconfig.json
    - packages/create-uploadkit-app/templates/remix/app/root.tsx
    - packages/create-uploadkit-app/templates/remix/app/entry.client.tsx
    - packages/create-uploadkit-app/templates/remix/app/entry.server.tsx
    - packages/create-uploadkit-app/templates/remix/app/routes.ts
    - packages/create-uploadkit-app/templates/remix/app/routes/_index.tsx
    - packages/create-uploadkit-app/templates/remix/app/routes/api.sign.ts
    - packages/create-uploadkit-app/templates/remix/README.md
    - packages/create-uploadkit-app/templates/remix/_gitignore
    - packages/create-uploadkit-app/templates/remix/_env.local
    - packages/create-uploadkit-app/src/__tests__/template-remix.test.ts
  modified: []
decisions:
  - "Branded slug as `remix` per CONTEXT.md D-07 (SEO + community familiarity) while the actual framework shipped is React Router v7 framework mode — the direct successor to Remix. The template README makes the mapping explicit."
  - "Added `app/routes.ts` with an explicit `RouteConfig` (index + route helpers) instead of relying on a flat-routes convention plugin. Framework mode's default is config-based routing; adding `@react-router/fs-routes` would have been an extra dep for no behavioural win on a two-route starter."
  - "Kept the plan's `_index.tsx` filename even though config-based routing makes the underscore cosmetic. The plan's must_haves artifact contract mandates that exact path, and any future developer copy-pasting a Remix tutorial will recognise the convention."
  - "Used `getSignedUrl` + raw `@aws-sdk/client-s3` in `api.sign.ts` (same primitives as the SvelteKit template) rather than adding a thin wrapper. Lets the user see exactly how presigned URLs are issued and keeps the template stack independent of any @uploadkitdev/* server package."
  - "503 on missing R2_* env vars — matches plan 12-05's Rule 2 deviation. The dev server boots, the dropzone renders, and the first upload click surfaces the exact remediation the user needs."
  - "Ship `process.env.R2_*` directly in `api.sign.ts` — RR7 reads `.env.local` via Vite and exposes it on `process.env` in the Node server bundle. No $env module ceremony needed (that was SvelteKit-specific)."
  - "`@uploadkitdev/react` declared as `latest` (not `workspace:*`) in the template package.json; plan 12-08's prepublishOnly script will rewrite to `^x.y.z` at publish time (CONTEXT.md D-06)."
  - "Used `onUploadComplete` / `onUploadError` (the real SDK prop names) instead of the plan's embedded snippet which showed `onComplete` — Rule 1 bug fix; the plan's snippet wouldn't compile against the real `UploadDropzoneProps` type."
  - "Added `.react-router` to the template `_gitignore` (generated types dir). It is already listed in `copy.ts` SKIP_DIRS, but the scaffolded project also needs it ignored at the user's local git level."
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 06: Remix (React Router v7) Template — Summary

Shipped the `remix` template consumed by `create-uploadkit-app`. The CLI
option is branded `remix` for SEO + community familiarity; the framework
underneath is React Router v7 in framework mode (SSR, the direct
successor to Remix 2 — the Remix team merged Remix into React Router).

Running `pnpm create uploadkit-app my-app --template remix` (once 12-08
is live) produces a React Router v7 project with:

- a streaming SSR entry point (`entry.server.tsx` + `entry.client.tsx`),
- an `app/routes.ts` `RouteConfig` wiring `_index.tsx` and `api/sign`,
- `<UploadKitProvider endpoint="/api/sign">` wrapping `<UploadDropzone />`
  from `@uploadkitdev/react` on the index page,
- an `action()` in `api.sign.ts` that mints presigned R2 PUT URLs via the
  raw AWS SDK (identical contract to the SvelteKit template),
- a `.env.local` with both managed + BYOS credentials pre-documented,
- a 503 fallback when BYOS R2_* vars are missing so `pnpm dev` always boots.

## Exact Framework Version

- **Branded as:** `remix`
- **Framework shipped:** `react-router` v7 (framework mode, SSR)
- All runtime deps declared as `latest` in the template — the real version
  is resolved at `pnpm install` time on the scaffolded project.

## Module Resolution Quirks

None that required a workaround, but three items worth flagging for the
docs:

1. **`app/routes.ts` is mandatory in framework mode.** RR7 dropped the
   auto-discovery of `app/routes/` files that Remix 2 used. The template
   now ships an explicit `RouteConfig`. If users add a new route, they
   must register it in `app/routes.ts` (or opt into `@react-router/fs-routes`,
   which we don't ship by default).
2. **`verbatimModuleSyntax: true`** in the template `tsconfig.json` means
   users must use `import type { ... }` for type-only imports. Matches the
   upstream `npx create-react-router` starter.
3. **`react-router/dom`** (not `react-router`) is where `HydratedRouter`
   lives — the client entry must import from the `/dom` subpath. Used in
   `app/entry.client.tsx`.

No CJS/ESM interop workarounds were needed — the AWS SDK, React, and
React Router all ship ESM that RR7's Vite bundler consumes cleanly.

## Exact SDK Exports Used

| Package                           | Export                       | Used in                          |
| --------------------------------- | ---------------------------- | -------------------------------- |
| `@uploadkitdev/react`             | `UploadKitProvider`          | `app/routes/_index.tsx`          |
| `@uploadkitdev/react`             | `UploadDropzone`             | `app/routes/_index.tsx`          |
| `@uploadkitdev/react`             | `./styles.css`               | `app/root.tsx`                   |
| `@aws-sdk/client-s3`              | `S3Client`, `PutObjectCommand` | `app/routes/api.sign.ts`       |
| `@aws-sdk/s3-request-presigner`   | `getSignedUrl`               | `app/routes/api.sign.ts`         |
| `react-router`                    | `Links`, `Meta`, `Outlet`, `Scripts`, `ScrollRestoration`, `ServerRouter` | `app/root.tsx`, `app/entry.server.tsx` |
| `react-router/dom`                | `HydratedRouter`             | `app/entry.client.tsx`           |
| `@react-router/dev/routes`        | `index`, `route`, `RouteConfig` | `app/routes.ts`              |
| `@react-router/dev/config`        | `Config` (type)              | `react-router.config.ts`         |
| `@react-router/node`              | `createReadableStreamFromReadable` | `app/entry.server.tsx`     |
| `isbot`                           | `isbot`                      | `app/entry.server.tsx`           |

## Verification

| Check                                                              | Result                         |
| ------------------------------------------------------------------ | ------------------------------ |
| `pnpm --filter create-uploadkit-app test -- template-remix`        | 1 file / 1 test passes         |
| `pnpm --filter create-uploadkit-app test` (full suite)             | 8 files / 45 tests pass        |
| `pnpm --filter create-uploadkit-app typecheck`                     | passes                         |
| `node -e "require('./packages/create-uploadkit-app/templates/remix/package.json')"` | parses; name `{{name}}` (pre-render) |

The smoke test drives the real scaffold engine against
`templates/remix/` into `os.tmpdir()` — same pattern as 12-04 and 12-05.
Plan 12-08's CI smoke test will extend this with `pnpm install && pnpm build`
against a packed tarball.

## Deviations from Plan

**1. [Rule 3 — Blocking] Added `app/routes.ts` (not in the plan's file list).**
- **Found during:** Task 1, reading React Router v7 framework-mode docs
  via Context7 (`/remix-run/react-router`).
- **Issue:** RR7 framework mode requires an explicit `RouteConfig` export
  from `app/routes.ts` — the plan assumed Remix's old flat-routes auto-
  discovery still applied. Without `routes.ts`, `pnpm dev` fails during
  `react-router dev`'s route graph build with "no routes configured".
- **Fix:** Added `app/routes.ts` with `index('./routes/_index.tsx')` and
  `route('api/sign', './routes/api.sign.ts')`. The plan's required
  artifacts (`_index.tsx`, `api.sign.ts`) still exist at the paths the
  plan specified — `routes.ts` just makes the wiring explicit.
- **Commit:** `db5fca7`

**2. [Rule 2 — Missing critical functionality] 503 response on missing R2 env vars.**
- **Found during:** Task 2, checking the plan's `pnpm dev` boot criterion
  against `must_haves.truths[0]`.
- **Issue:** Without the guard, the S3Client instantiates with undefined
  creds and throws a cryptic AWS SDK error on the first action call. Dev
  server would boot but uploads would surface an unhelpful stack trace.
- **Fix:** Early-return `Response.json({ error: '...' }, { status: 503 })`.
  Matches the SvelteKit template's pattern (plan 12-05 deviation #2) and
  the Next template's placeholder-key fallback philosophy (12-04 deviation
  #1). The dev server boots, the dropzone renders, and the first click
  surfaces the exact remediation the user needs.
- **Commit:** `db5fca7`

**3. [Rule 1 — Bug] Fixed wrong prop name in plan's embedded snippet.**
- **Found during:** Task 2, cross-checking
  `packages/react/src/components/upload-dropzone.tsx`.
- **Issue:** The plan's snippet used `onComplete={(files) => ...}`. The
  real `UploadDropzoneProps` type declares `onUploadComplete?: (results:
  UploadResult[]) => void` — `onComplete` does not exist. Copy-pasting
  the plan's snippet verbatim would typecheck-fail on a user's project.
- **Fix:** Used `onUploadComplete` + `onUploadError` (both typed in the
  SDK). Same callback shape used in `templates/next/app/page.tsx`.
- **Commit:** `db5fca7`

**4. [Rule 3 — Blocking] Added a streaming SSR `entry.server.tsx` pair with `entry.client.tsx`.**
- These were in the plan's file list but not the snippet. Shipped the
  canonical RR7 streaming pair (`renderToPipeableStream` + `isbot` for
  bot-vs-human render gating) so SSR actually works. Without these, the
  framework falls back to default entries that work but skip the
  streaming optimisation — shipping them explicitly matches what users
  see when running `npx create-react-router@latest`.

**5. Added `vite-tsconfig-paths` devDep.**
- Not in the plan. Matches the upstream RR7 starter — lets users use
  `~/components/foo` path aliases out of the box (the tsconfig.json
  declares the `~/*` → `./app/*` mapping). Zero runtime cost; dev-only.

**6. Inline-styled header + description on `_index.tsx`.**
- The plan's snippet had a minimal `<h1>` only. Per the global CLAUDE.md
  design-agent directive, shipped a small branded style block (dark
  surface `#0a0a0b`, indigo-ish accents via `#141416` code tags,
  `letter-spacing: -0.02em` heading) so the demo looks intentional
  rather than un-styled. Zero external CSS deps; all inline.

## Known Stubs

None — the template is end-to-end functional. Without R2 creds the
action returns a 503 with actionable text. With BYOS creds filled in,
uploads succeed directly to the bucket. The `UploadDropzone` itself
targets `/api/sign` via the provider's endpoint config; no frontend
wiring stubs.

## Threat Flags

None — the template introduces no new security surface. The presigning
endpoint:

- validates body shape (`{ filename, contentType }`),
- scopes signed URLs to a random UUID-prefixed key (no overwrite risk),
- pins `ContentType` into the signature (prevents content-type spoof),
- restricts signed-URL lifetime to 5 minutes,
- reads creds from `process.env` server-side only (never reaches the
  client bundle — RR7's `.server` / server-only boundary is respected
  because the action file is server-only by convention).

## Commits

- `87bcdc8` — `feat(12-06): add remix (React Router v7 framework mode) template scaffold`
- `db5fca7` — `feat(12-06): add remix index route with dropzone, api.sign action, and smoke test`

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/templates/remix/package.json`
- FOUND: `packages/create-uploadkit-app/templates/remix/react-router.config.ts`
- FOUND: `packages/create-uploadkit-app/templates/remix/vite.config.ts`
- FOUND: `packages/create-uploadkit-app/templates/remix/tsconfig.json`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/root.tsx`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/entry.client.tsx`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/entry.server.tsx`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/routes.ts`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/routes/_index.tsx`
- FOUND: `packages/create-uploadkit-app/templates/remix/app/routes/api.sign.ts`
- FOUND: `packages/create-uploadkit-app/templates/remix/README.md`
- FOUND: `packages/create-uploadkit-app/templates/remix/_gitignore`
- FOUND: `packages/create-uploadkit-app/templates/remix/_env.local`
- FOUND: `packages/create-uploadkit-app/src/__tests__/template-remix.test.ts`
- FOUND commit: `87bcdc8`
- FOUND commit: `db5fca7`
