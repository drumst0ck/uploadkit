---
phase: 12-create-uploadkit-app-cli
plan: 07
subsystem: create-uploadkit-app
tags: [template, vite, react19, byos, spa]
requires:
  - "12-03 (template engine: copy, render, env, install, git)"
  - "12-04 (Next template conventions: file renames, {{placeholders}}, test pattern)"
provides:
  - "templates/vite/ — Vite + React 19 + @uploadkitdev/react pure SPA (BYOS demo)"
  - "src/App.tsx — UploadKitProvider wrapping UploadDropzone, endpoint from VITE_UPLOADKIT_ENDPOINT"
  - "src/main.tsx — React 19 createRoot bootstrap, imports @uploadkitdev/react/styles.css"
  - "Split tsconfig: tsconfig.json (refs) + tsconfig.app.json + tsconfig.node.json — matches create-vite pattern"
  - "README.md with prominent prototyping warning, BYOS contract, Hono/Express/Workers examples"
  - "_env.local with UPLOADKIT_API_KEY placeholder + VITE_UPLOADKIT_ENDPOINT + documented VITE_* browser-exposure warning"
  - "Template smoke test (scaffold into tmpdir, assert files + deps + BYOS README + no server deps)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Vite 'react-ts' preset layout: index.html at root, src/{main,App}.tsx, split tsconfigs"
    - "VITE_* env prefix for browser-exposed values; never uk_live_* keys"
    - "Endpoint resolution falls back to '/api/sign' so pnpm dev boots even without .env.local configured"
    - "SDK styles imported once in main.tsx (parity with next template's layout.tsx)"
    - "No server-side deps (no @aws-sdk, no @uploadkitdev/next, no framework server runtime) — BYOS is explicitly documented in README as user-provided"
    - "Template .tsx/.ts files contain zero {{placeholders}} — only package.json/README/.env rendered"
key-files:
  created:
    - packages/create-uploadkit-app/templates/vite/package.json
    - packages/create-uploadkit-app/templates/vite/vite.config.ts
    - packages/create-uploadkit-app/templates/vite/tsconfig.json
    - packages/create-uploadkit-app/templates/vite/tsconfig.app.json
    - packages/create-uploadkit-app/templates/vite/tsconfig.node.json
    - packages/create-uploadkit-app/templates/vite/index.html
    - packages/create-uploadkit-app/templates/vite/src/main.tsx
    - packages/create-uploadkit-app/templates/vite/src/App.tsx
    - packages/create-uploadkit-app/templates/vite/src/index.css
    - packages/create-uploadkit-app/templates/vite/README.md
    - packages/create-uploadkit-app/templates/vite/_gitignore
    - packages/create-uploadkit-app/templates/vite/_env.local
    - packages/create-uploadkit-app/src/__tests__/template-vite.test.ts
  modified: []
decisions:
  - "Shipped Vite's current recommended split tsconfig (tsconfig.json references tsconfig.app.json + tsconfig.node.json) instead of a single flat tsconfig. Matches `pnpm create vite@latest` output in 2026 and keeps strict + bundler resolution on the app while letting vite.config.ts typecheck against node types separately."
  - "Endpoint fallback: `import.meta.env.VITE_UPLOADKIT_ENDPOINT ?? '/api/sign'` so `pnpm dev` boots cleanly on a freshly-scaffolded project even if the user hasn't touched `.env.local`. Matches the Rule 2 deviation philosophy from plans 12-04 / 12-05 / 12-06."
  - "Kept App.tsx and main.tsx free of `{{placeholders}}`. The engine's render pass only touches package.json/README/.env — TSX stays literal per the convention established in 12-04."
  - "Declared `@uploadkitdev/react` as `latest` (not `workspace:*`). Plan 12-08's prepublishOnly will rewrite to `^x.y.z` at publish time (CONTEXT.md D-06). Same as other templates."
  - "Used `onUploadComplete` / `onUploadError` (the real SDK prop names) instead of the plan's embedded `onComplete` — same Rule 1 fix as plan 12-06. Plan snippet wouldn't compile against `UploadDropzoneProps`."
  - "No `VITE_UPLOADKIT_PUBLIC_KEY` wired into code. The plan mentioned this env var but current `UploadKitProvider` consumes the key server-side via the endpoint, not client-side. Left it commented-out in `_env.local` with a warning so users who add a custom flow (e.g. a client-side direct R2 PUT bypassing /api/sign) know the correct prefix. Avoids shipping dead code that reads an env var nothing consumes."
  - "No JavaScript variant — per D-07 we only ship TS for now. README explicitly states the JS variant is not yet shipped. CLI continues to treat `opts.typescript: false` as a no-op (unchanged from 12-04)."
  - "Inline-styled header (dark surface + indigo accent) matching the remix template's aesthetic. Per global CLAUDE.md design-agent directive: the demo looks intentional out of the box, zero external CSS deps beyond SDK styles + a tiny index.css reset."
  - "Added `VITE_*` browser-exposure security warning both in README.md (Security section) and `_env.local` (comment block). Critical: Vite inlines every VITE_* var into the client bundle at build time — scaffolded users MUST know before they accidentally commit a `uk_live_*` key behind a VITE_ prefix."
metrics:
  completed: 2026-04-15
---

# Phase 12 Plan 07: Vite Template — Summary

Shipped the `vite` template consumed by `create-uploadkit-app`. This is
the pure-SPA BYOS demo for the "I already have a backend" use case that
Vite developers typically fit into.

Running `pnpm create uploadkit-app my-app --template vite` (once 12-08 is
live) produces a Vite + React 19 project that:

- mounts `<UploadKitProvider>` + `<UploadDropzone>` on render,
- reads its backend endpoint from `VITE_UPLOADKIT_ENDPOINT` with a safe
  `/api/sign` fallback so `pnpm dev` never crashes,
- ships **zero server code** — the README instead documents the
  presigned-URL contract the user needs to implement on their own
  backend, with copy-paste examples for Hono, Express, and Cloudflare
  Workers,
- warns explicitly (in README + `_env.local`) that `VITE_*` vars are
  browser-exposed so users never ship a `uk_live_*` key by accident.

## Versions Picked

| Package                   | Version declared | Notes                                    |
| ------------------------- | ---------------- | ---------------------------------------- |
| `vite`                    | `latest`         | Picks up whatever Vite the user installs |
| `@vitejs/plugin-react`    | `latest`         | React Fast Refresh + automatic JSX       |
| `react`, `react-dom`      | `latest`         | React 19 (compiler / `use()` ready)      |
| `@uploadkitdev/react`     | `latest`         | Rewritten to `^x.y.z` by 12-08 publish   |
| `typescript`              | `latest`         | Strict + bundler resolution              |
| `@types/react`, `@types/react-dom` | `latest` | DOM + Client types                       |

No runtime server deps — by design.

## tsconfig Tweaks

Matches the current `pnpm create vite@latest` output:

1. `tsconfig.json` — references-only (no `compilerOptions`). Delegates
   type-check to the two files below.
2. `tsconfig.app.json` — the app's compiler config. `strict`, `bundler`
   resolution, `verbatimModuleSyntax`, `isolatedModules`, `react-jsx`.
   Only `include`s `src/`.
3. `tsconfig.node.json` — for `vite.config.ts`. `target: ES2023`, `types:
   ['node']`. Only `include`s `vite.config.ts`.

This split is required by current Vite docs because the config file runs
in Node and needs different lib + types than the app bundle.

## Exact SDK Exports Used

| Package                | Export                 | Used in                  |
| ---------------------- | ---------------------- | ------------------------ |
| `@uploadkitdev/react`  | `UploadKitProvider`    | `src/App.tsx`            |
| `@uploadkitdev/react`  | `UploadDropzone`       | `src/App.tsx`            |
| `@uploadkitdev/react`  | `./styles.css`         | `src/main.tsx`           |
| `react-dom/client`     | `createRoot`           | `src/main.tsx`           |
| `react`                | `StrictMode`           | `src/main.tsx`           |

No shims needed.

## Verification

| Check                                                             | Result                   |
| ----------------------------------------------------------------- | ------------------------ |
| `pnpm --filter create-uploadkit-app test -- template-vite`        | 1 file / 1 test passes   |
| `pnpm --filter create-uploadkit-app test` (full suite)            | 9 files / 46 tests pass  |
| `node -e "require('./packages/create-uploadkit-app/templates/vite/package.json')"` | parses; name `{{name}}` (pre-render) |

The smoke test drives the real scaffold engine against `templates/vite/`
into `os.tmpdir()` — same pattern as 12-04, 12-05, 12-06.

## Deviations from Plan

**1. [Rule 3 — Blocking] Split tsconfig into three files (tsconfig.json + tsconfig.app.json + tsconfig.node.json).**
- **Found during:** Task 1, writing `vite.config.ts`.
- **Issue:** The plan's file list named only `tsconfig.json` +
  `tsconfig.node.json`. Current Vite `react-ts` scaffold splits the app
  config into its own `tsconfig.app.json` referenced from the root
  `tsconfig.json`. Without the split, either (a) `vite.config.ts` loses
  `@types/node` types or (b) the app loses DOM types.
- **Fix:** Added `tsconfig.app.json` and made the root `tsconfig.json`
  references-only. Matches `pnpm create vite@latest` output.
- **Commit:** `07066af`

**2. [Rule 1 — Bug] Used `onUploadComplete` / `onUploadError` instead of plan's `onComplete`.**
- **Found during:** Task 1, cross-checking `packages/react/src/components/upload-dropzone.tsx`.
- **Issue:** The plan's embedded snippet used `onComplete={(files) => ...}`.
  `UploadDropzoneProps` declares `onUploadComplete?: (results: UploadResult[]) => void` —
  `onComplete` does not exist. Verbatim copy would typecheck-fail.
- **Fix:** Used the real SDK prop names. Same fix as plan 12-06.
- **Commit:** `07066af`

**3. [Rule 2 — Missing critical functionality] Endpoint fallback for crash-free dev.**
- **Found during:** Task 1, checking the plan's "`pnpm dev` boots without
  crash on placeholder key" must-have.
- **Issue:** `import.meta.env.VITE_UPLOADKIT_ENDPOINT!` (non-null assertion)
  would fail if `.env.local` is missing / renamed. Template must boot
  even without env config so the user sees the dropzone before doing
  anything.
- **Fix:** `??` fallback to `/api/sign`. Matches the Next/SvelteKit/Remix
  philosophy from 12-04/05/06.
- **Commit:** `07066af`

**4. [Rule 2 — Missing critical functionality] VITE_* browser-exposure security warning.**
- **Found during:** Task 1, writing `_env.local` against the plan's
  requirement that `VITE_UPLOADKIT_PUBLIC_KEY` be a placeholder and
  "must be `uk_test_*`, never `uk_live_*`".
- **Issue:** The plan captured the requirement but didn't say where it
  should be surfaced to the user. Given that Vite inlines `VITE_*` vars
  into the production bundle at build time, a scaffolded user could
  easily leak a live key if we only mention this in the plan.
- **Fix:** Added explicit warning blocks in BOTH `_env.local` (comment
  block right above the `VITE_*` vars) and `README.md` (dedicated
  "Security" section). The comment names the prefix, explains the
  inlining behaviour, and tells users which value is safe (`uk_test_*`).
- **Commit:** `07066af`

**5. Inline-styled header on App.tsx.**
- Plan snippet was minimal (`<h1>` + `<p>` only). Per global CLAUDE.md
  design-agent directive: shipped a small branded style block (dark
  `#0a0a0b`, indigo `#818cf8`, `letter-spacing: -0.02em` heading,
  `#141416` code tags) + a tiny `index.css` reset so the demo looks
  intentional. Zero external CSS deps beyond the SDK's own styles.

**6. `VITE_UPLOADKIT_PUBLIC_KEY` kept commented-out, not wired to code.**
- The plan named this env var. The current `UploadKitProvider` API
  doesn't read a public-key prop — keys live on the backend signing
  endpoint. Wiring a read of this var into `App.tsx` would be dead code
  today (and would encourage users to ship client-side keys, which the
  README actively warns against).
- Kept it in `_env.local` as a commented hint for users who write a
  custom direct-upload flow, with a loud warning that live keys never
  belong here.

## Known Stubs

None. The template is end-to-end functional against a user-provided
backend. Without a backend, the dropzone renders, the user clicks, and
`fetch('/api/sign')` fails loudly — which is the documented behaviour
(README explicitly says "uploads will fail until you wire up a backend —
that's intentional"). The first failure surfaces the exact remediation
path.

## Threat Flags

None. The template introduces no new security surface — it ships no
server code at all. The only security-relevant thing it does add is
**documentation** (README Security section + `_env.local` comment block)
warning users that `VITE_*` vars are browser-exposed. This is a
mitigation, not a new surface.

## Commits

- `07066af` — `feat(12-07): add Vite + React 19 template (BYOS-oriented SPA) with smoke test`

## Self-Check: PASSED

- FOUND: `packages/create-uploadkit-app/templates/vite/package.json`
- FOUND: `packages/create-uploadkit-app/templates/vite/vite.config.ts`
- FOUND: `packages/create-uploadkit-app/templates/vite/tsconfig.json`
- FOUND: `packages/create-uploadkit-app/templates/vite/tsconfig.app.json`
- FOUND: `packages/create-uploadkit-app/templates/vite/tsconfig.node.json`
- FOUND: `packages/create-uploadkit-app/templates/vite/index.html`
- FOUND: `packages/create-uploadkit-app/templates/vite/src/main.tsx`
- FOUND: `packages/create-uploadkit-app/templates/vite/src/App.tsx`
- FOUND: `packages/create-uploadkit-app/templates/vite/src/index.css`
- FOUND: `packages/create-uploadkit-app/templates/vite/README.md`
- FOUND: `packages/create-uploadkit-app/templates/vite/_gitignore`
- FOUND: `packages/create-uploadkit-app/templates/vite/_env.local`
- FOUND: `packages/create-uploadkit-app/src/__tests__/template-vite.test.ts`
- FOUND commit: `07066af`
