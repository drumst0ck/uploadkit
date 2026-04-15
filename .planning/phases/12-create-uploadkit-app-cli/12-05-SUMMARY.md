---
phase: 12-create-uploadkit-app-cli
plan: 05
subsystem: create-uploadkit-app
tags: [template, sveltekit, svelte5, presigned-url, r2]
requires:
  - "12-03 (template engine: copy, render, env, install, git)"
  - "12-04 (Next template conventions: file renames, {{placeholders}}, test pattern)"
provides:
  - "templates/sveltekit/ — SvelteKit + Svelte 5 + adapter-auto + raw presigned PUT flow"
  - "Upload page using Svelte 5 runes ($state) + native fetch"
  - "+server.ts POST endpoint issuing presigned R2 URLs via @aws-sdk/s3-request-presigner"
  - "Template smoke test (scaffold into tmpdir, assert files + deps + Svelte 5 syntax)"
affects: []
tech-stack:
  added:
    - "@aws-sdk/client-s3 (template-level runtime dep)"
    - "@aws-sdk/s3-request-presigner (template-level runtime dep)"
  patterns:
    - "Svelte 5 runes: $state<Status>('idle') instead of writable store for local component state"
    - "Event attribute syntax: onchange={fn} / onclick={fn} (Svelte 5) — NOT on:change / on:click (Svelte 4)"
    - "SvelteKit $env/dynamic/private for reading R2_* env vars (keeps values out of the client bundle)"
    - "Endpoint returns structured { url, key, method } so the client has a typed contract"
    - "503 + remediation message when R2_* env vars missing — dev server stays boot-able"
    - "No React SDK / no @uploadkitdev/* deps — SvelteKit users stay in Svelte"
    - "Template TSX/Svelte files contain zero {{placeholders}}; only package.json/README/.env rendered"
key-files:
  created:
    - packages/create-uploadkit-app/templates/sveltekit/package.json
    - packages/create-uploadkit-app/templates/sveltekit/svelte.config.js
    - packages/create-uploadkit-app/templates/sveltekit/vite.config.ts
    - packages/create-uploadkit-app/templates/sveltekit/tsconfig.json
    - packages/create-uploadkit-app/templates/sveltekit/src/app.html
    - packages/create-uploadkit-app/templates/sveltekit/src/app.d.ts
    - packages/create-uploadkit-app/templates/sveltekit/src/routes/+page.svelte
    - packages/create-uploadkit-app/templates/sveltekit/src/routes/api/sign/+server.ts
    - packages/create-uploadkit-app/templates/sveltekit/README.md
    - packages/create-uploadkit-app/templates/sveltekit/_gitignore
    - packages/create-uploadkit-app/templates/sveltekit/_env.local
    - packages/create-uploadkit-app/src/__tests__/template-sveltekit.test.ts
  modified: []
decisions:
  - "Ship @aws-sdk/client-s3 + s3-request-presigner directly in the template (NOT behind an @uploadkitdev/* package). SvelteKit devs already pay the AWS SDK cost once at install time; this avoids a tiny pass-through wrapper package and keeps the template fully transparent — users see exactly how presigned URLs are issued."
  - "Use $env/dynamic/private (not $env/static/private) for R2_*. Dynamic is read at request time, which matches a scaffolded app's dev workflow (edit .env.local → restart not required for Kit's private env proxy in many adapters)."
  - "503 on missing env vars with an actionable message instead of throwing. The dev server must boot on uk_test_placeholder so the user can see the upload form before configuring BYOS — Rule 2 parity with the Next template's fallback."
  - "No Tailwind. SvelteKit starter fast path is vanilla <style> in .svelte files; adding Tailwind would be a full 3-file config that most SvelteKit users don't want. The demo uses scoped Svelte styles with the brand dark/indigo tokens inline."
  - "Ship _env.local that documents BYOS as optional — UPLOADKIT_API_KEY placeholder first, R2_* vars commented-out with a note. Mirrors the managed/BYOS decision in CONTEXT.md D-07."
  - "Keep .svelte-kit and build in SKIP_DIRS (already present in copy.ts) so future local svelte-kit sync artefacts never leak into a scaffold."
  - "Use Svelte 5 runes + new event attribute syntax everywhere (onchange, onclick) so the template works correctly when users bump svelte to newer 5.x patch releases — the legacy on:click syntax still works in compat mode but emits deprecation warnings on fresh Svelte 5 projects."
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 05: SvelteKit Template — Summary

Shipped the `sveltekit` template consumed by `create-uploadkit-app`.
Running `pnpm create uploadkit-app my-app --template sveltekit` (once 12-08
is live) now produces a SvelteKit + Svelte 5 project with a
`+page.svelte` upload UI, a `+server.ts` endpoint that issues presigned
PUT URLs via the raw AWS SDK, and a `.env.local` pre-configured with
both the managed UploadKit placeholder key AND commented-out BYOS R2
credentials.

This template deliberately avoids any `@uploadkitdev/*` dependency —
SvelteKit devs get the raw presigned-URL primitive that's identical to
what the SDK does under the hood.

## What Landed

### Task 1 — project files + adapter-auto scaffold

- `package.json` — `{{name}}` for the project name; scripts
  (`dev`/`build`/`preview`/`check`); `latest` deps for:
  - runtime: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - dev: `@sveltejs/kit`, `@sveltejs/adapter-auto`,
    `@sveltejs/vite-plugin-svelte`, `svelte`, `svelte-check`,
    `typescript`, `vite`
- `svelte.config.js` — `vitePreprocess()` + `adapter-auto`.
- `vite.config.ts` — standard `sveltekit()` plugin.
- `tsconfig.json` — extends SvelteKit's generated `.svelte-kit/tsconfig.json`,
  adds `strict` + `bundler` resolution.
- `src/app.html` — SvelteKit's default shell with `<title>UploadKit —
  SvelteKit</title>`.
- `src/app.d.ts` — empty `App` namespace declaration.
- `_gitignore` — standard SvelteKit ignores (`.svelte-kit`, `build`,
  `.vercel`, `.netlify`, env files).
- `_env.local` — managed key first (`UPLOADKIT_API_KEY=uk_test_placeholder`),
  plus BYOS `R2_*` vars commented-out with a note that BYOS is optional.
- `README.md` — renders `{{name}}` / `{{pkgManager}}` / `{{year}}`; three
  next steps (get creds, fill .env.local, read docs); links to
  `docs.uploadkit.dev/sveltekit`.

### Task 2 — upload page, presigned URL endpoint, smoke test

- `src/routes/api/sign/+server.ts`:
  - Validates `{ filename, contentType }` with a hand-rolled type guard
    (avoids pulling in zod for a two-field body).
  - Reads `R2_*` from `$env/dynamic/private`.
  - Returns `json({ error, message }, 503)` with a remediation hint if
    any R2 var is missing — `pnpm dev` stays boot-able.
  - Constructs an S3 client pointed at
    `https://${accountId}.r2.cloudflarestorage.com`, region `'auto'`.
  - Generates `crypto.randomUUID() + '-' + filename` as the key.
  - Signs a `PutObjectCommand` with `ContentType` explicitly set (per
    CLAUDE.md — signature mismatches → 403).
  - Returns `{ url, key, method: 'PUT' }` with a 5-minute expiry.

- `src/routes/+page.svelte` (Svelte 5 runes):
  - `$state` for `status`, `file`, `errorMessage`, `uploadedKey`.
  - `pickFile(event)` handler reads the selected file and resets status.
  - `upload()`: POST `/api/sign`, then `fetch(url, { method: 'PUT', body, headers })`
    with matching `content-type`.
  - Tiny branded style block (dark surface, indigo accent, dashed
    dropzone border) so the demo looks intentional out of the box.
  - Uses new Svelte 5 event syntax (`onchange`, `onclick`) — not the
    legacy `on:change` syntax.

- `src/__tests__/template-sveltekit.test.ts` — drives `scaffold()` against
  the real `templates/sveltekit/` into `os.tmpdir()`, asserts:
  - every expected file exists (incl. `src/routes/api/sign/+server.ts`
    and `src/routes/+page.svelte`),
  - `package.json` has the AWS SDK runtime deps + SvelteKit dev deps + no
    React,
  - scripts are `vite dev` / `vite build`,
  - README renders `{{name}}` / `{{pkgManager}}` / `{{year}}` with zero
    leftover placeholders,
  - `.env.local` has both the UploadKit placeholder key AND the BYOS R2
    hints,
  - `svelte.config.js` uses `@sveltejs/adapter-auto`,
  - `+server.ts` references `getSignedUrl`, `PutObjectCommand`,
    `ContentType`, and `R2_BUCKET`,
  - `+page.svelte` uses `$state` + `type="file"` + posts to `/api/sign`
    + PUT method.

## Exact APIs Used

| Package                              | Export                       | Used in                               |
| ------------------------------------ | ---------------------------- | ------------------------------------- |
| `@aws-sdk/client-s3`                 | `S3Client`                   | `src/routes/api/sign/+server.ts`      |
| `@aws-sdk/client-s3`                 | `PutObjectCommand`           | `src/routes/api/sign/+server.ts`      |
| `@aws-sdk/s3-request-presigner`      | `getSignedUrl`               | `src/routes/api/sign/+server.ts`      |
| `@sveltejs/kit`                      | `json`, `RequestHandler`     | `src/routes/api/sign/+server.ts`      |
| `$env/dynamic/private` (SvelteKit)   | `env`                        | `src/routes/api/sign/+server.ts`      |
| `svelte` (runtime)                   | `$state` rune                | `src/routes/+page.svelte`             |

## Verification

| Check                                                               | Result                       |
| ------------------------------------------------------------------- | ---------------------------- |
| `pnpm --filter create-uploadkit-app test -- template-sveltekit`     | 1 file / 1 test passes       |
| `pnpm --filter create-uploadkit-app test` (full suite)              | 7 files / 44 tests pass      |
| `pnpm --filter create-uploadkit-app typecheck`                      | passes                       |
| `node -e "require('./packages/create-uploadkit-app/templates/sveltekit/package.json')"` | parses; name `{{name}}` (pre-render) |

The smoke test exercises the full scaffold engine end-to-end against
the real `templates/sveltekit/` directory — no fixture. Same pattern
12-04 established and 12-08 will extend with `pnpm install && pnpm build`
on a packed tarball.

## Deviations from Plan

**1. [Rule 3 — Blocking] Added `@sveltejs/vite-plugin-svelte` to devDependencies.**
- **Found during:** Task 1, writing `vite.config.ts` which does
  `import { sveltekit } from '@sveltejs/kit/vite'`.
- **Issue:** The plan's file list named only `svelte`, `@sveltejs/kit`,
  `@sveltejs/adapter-auto`, `vite`, `typescript`. `svelte.config.js`
  uses `vitePreprocess()` which lives in `@sveltejs/vite-plugin-svelte`
  since SvelteKit 2.x — without it, `pnpm dev` fails with a module
  resolution error.
- **Fix:** Added `@sveltejs/vite-plugin-svelte: latest` to
  `devDependencies`. Also added `svelte-check` so the `check` script
  (scaffolded by every official SvelteKit starter) actually works.
- **Commit:** `7eb521f`

**2. [Rule 2 — Missing critical functionality] 503 response on missing R2 env vars.**
- **Found during:** Task 2, checking the plan's `pnpm dev` boot
  requirement.
- **Issue:** Without the guard, the S3Client would instantiate with
  `undefined` creds and throw a cryptic error on the first signing call.
  The dev server itself would still boot, but any upload attempt would
  surface an unhelpful stack trace instead of a next-step.
- **Fix:** Early-return `json({ error: 'Set R2_* env vars in .env.local' }, 503)`.
  This matches the Next template's placeholder-key fallback philosophy
  from plan 12-04 (Rule 2 deviation there): the dev server boots, the
  upload form renders, and the first click surfaces the exact
  remediation the user needs.
- **Commit:** `82e4aae`

**3. Svelte 5 event syntax (`onchange`, `onclick`) instead of `on:change`.**
- The plan's embedded snippet used `on:change` / `on:click` (Svelte 4
  syntax). Svelte 5 still supports this in compat mode but emits
  deprecation warnings. Since the plan explicitly targets "Svelte 5",
  used the new attribute syntax throughout. Equivalent to using runes
  `$state` instead of writable stores for local component state.

**4. Added scoped `<style>` block with brand tokens to +page.svelte.**
- Plan snippet was minimal (HTML only). Per the project's design-agent
  directive in global CLAUDE.md, shipped a small branded style block
  (dark surface `#0a0a0b`, indigo accent `#6366f1`, dashed dropzone
  border, hover transitions) so the demo looks intentional rather than
  un-styled. Still zero external CSS deps.

## Known Stubs

None — the template is end-to-end functional. Without R2 creds, the
endpoint returns a 503 with actionable text. With BYOS creds filled in,
uploads succeed directly to the bucket.

## Threat Flags

None — the template introduces no new security surface beyond what
`@aws-sdk/client-s3` already provides. The endpoint:
- validates body shape,
- scopes signed URL to a random UUID key (prevents object-name
  collision / overwrite attacks),
- pins `ContentType` into the signature (prevents content-type spoof),
- restricts signed URL lifetime to 5 minutes,
- reads creds via `$env/dynamic/private` (never exposed to the client
  bundle).

## Commits

- `7eb521f` — `feat(12-05): add SvelteKit template project files (Svelte 5 + TS + adapter-auto)`
- `82e4aae` — `feat(12-05): add SvelteKit upload page, presigned URL endpoint, and smoke test`

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/templates/sveltekit/package.json`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/svelte.config.js`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/vite.config.ts`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/tsconfig.json`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/src/app.html`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/src/app.d.ts`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/src/routes/+page.svelte`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/src/routes/api/sign/+server.ts`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/README.md`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/_gitignore`
- FOUND: `packages/create-uploadkit-app/templates/sveltekit/_env.local`
- FOUND: `packages/create-uploadkit-app/src/__tests__/template-sveltekit.test.ts`
- FOUND commit: `7eb521f`
- FOUND commit: `82e4aae`
