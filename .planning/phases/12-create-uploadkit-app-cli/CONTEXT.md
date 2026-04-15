---
phase: 12-create-uploadkit-app-cli
type: context
requirements: [GROW-01, GROW-02, GROW-03]
---

# Phase 12 — Context & Locked Decisions

This document captures decisions executors must honor when implementing the
`create-uploadkit-app` CLI and its four starter templates. These are locked —
do not re-litigate during execution.

## D-01 — Package location & name
- Package lives at `packages/create-uploadkit-app/`.
- Published name: `create-uploadkit-app` (unscoped — required for the
  `npm init <name>` / `pnpm create <name>` / `yarn create <name>` /
  `bun create <name>` shortcuts to work).
- Bin entry: `"create-uploadkit-app": "./dist/index.js"`.
- Version policy: the CLI itself follows Changesets like the rest of the
  monorepo. Scaffolded templates declare `@uploadkitdev/*` at `^LATEST`
  where `LATEST` is resolved at publish time (see D-06).

## D-02 — CLI framework: `@clack/prompts` + native `process.argv`
- Use `@clack/prompts` for interactive prompts (modern UX, minimal bundle,
  first-class cancel handling, matches create-vite / create-t3-app feel).
- Use native `process.argv` parsing (lightweight) with `mri` as a tiny
  dependency for flags. Avoid `commander` — too heavy for a single-command
  binary.
- Rationale: `@clack/prompts` is what leading scaffolders ship in 2025; it
  renders correctly across terminals and handles Ctrl+C without throwing.

## D-03 — Language & build: TypeScript + tsup
- CLI source is TypeScript strict (matches monorepo config).
- Bundle with `tsup` (already used by `packages/react`, `packages/next`,
  `packages/shared`). Output: single ESM file with a Node shebang, plus a
  CJS fallback — Node 20 LTS as minimum runtime.
- Templates are shipped as-is (no build step); the CLI only copies files
  and renders placeholders.

## D-04 — Template strategy: co-located & copied at runtime
- Templates live at `packages/create-uploadkit-app/templates/<name>/`.
- Templates are copied from disk — NOT downloaded from GitHub or a tarball.
  This is faster, works offline, and avoids "template moved / renamed"
  breakage.
- Placeholder syntax: `{{name}}`, `{{pkgManager}}`, `{{year}}` rendered in
  `package.json`, `README.md`, and `.env.local`.
- Template files are included in the published tarball via the `files`
  field in `package.json` (`"files": ["dist", "templates"]`).

## D-05 — Package manager detection
- Detect via `npm_config_user_agent` env var (set by all four PMs when they
  invoke their `create` shortcut).
- Fallback order if detection fails: `pnpm` → `npm`.
- User can override via interactive prompt.
- Respect the detected PM for `install` and `lockfile` generation.

## D-06 — SDK version pinning at publish time
- A `prepublishOnly` script resolves `@uploadkitdev/react` and
  `@uploadkitdev/next` latest versions from the registry and rewrites
  each template's `package.json` to `^<version>` before publishing.
- This means `git`-tracked template `package.json` files use
  `"workspace:*"` for local dev, rewritten to `^x.y.z` at publish.

## D-07 — What each template ships
Every template ships a single upload demo page that renders
`UploadDropzone` from `@uploadkitdev/react` against a placeholder API key
`uk_test_placeholder`. No auth, no DB, no CI, no Dockerfile.

- `next`: Next.js 16 App Router + Tailwind v4 + `@uploadkitdev/next` route
  handler at `/api/uploadkit/route.ts`. TS by default; JS variant omitted
  (Next 16 discourages JS).
- `sveltekit`: SvelteKit with Svelte 5, `+server.ts` endpoint that returns
  a presigned PUT URL via `@aws-sdk/client-s3`, vanilla upload page (no
  React SDK — SvelteKit users don't want React).
- `remix`: React Router v7 (framework mode, the successor to Remix) with
  an `action` that returns a presigned URL. Uses `@uploadkitdev/react`.
- `vite`: Vite + React 19 with BYOS demo — calls a placeholder
  `/api/sign` endpoint (documented in README as "you provide this").
  Pure SPA, no server.

## D-08 — Changesets & CI
- CLI is published alongside other packages via the existing Changesets
  release workflow (`.github/workflows/release.yml`).
- A smoke test runs in CI: `npx --no create-uploadkit-app@<packed-tarball>
  _tmp --template next --pm pnpm --yes` then `cd _tmp && pnpm install &&
  pnpm build`. Failure blocks the release.

## D-09 — Out of scope
- No non-JS templates (no Python/Go/Rust).
- No post-publish template hot-updates (templates are frozen at each
  version bump).
- No CI scaffolding, Docker, or DB inside scaffolded projects.
- No interactive "add a component" flow (that's Phase 14 territory).
