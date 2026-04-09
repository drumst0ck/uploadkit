---
type: quick
task: 260409-jdo
date: "2026-04-09"
duration: "~10 minutes"
tasks_completed: 3
files_modified: 19
commits:
  - "3dfb6c8"
  - "f348730"
  - "24ed905"
tags: [sdk, react, uploadkit, feature-parity, uploadthing]
---

# Quick Task 260409-jdo: Implement 7 UploadThing Feature Gaps — Summary

**One-liner:** Implemented all 7 UploadThing feature gaps: config.mode manual/auto, onBeforeUploadBegin callback, data-uk-element/data-state attributes on all elements, progress granularity coarse/fine/all, NextSSRPlugin for SSR hydration, withUk Tailwind wrapper with custom variants, and Express/Fastify/Hono backend adapters.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | SDK component features — config.mode, onBeforeUploadBegin, data attrs, progress granularity | 3dfb6c8 | upload-button.tsx, upload-dropzone.tsx, upload-modal.tsx, file-list.tsx, file-preview.tsx, proxy-client.ts, use-upload-kit.ts, styles.css |
| 2 | Infrastructure — NextSSRPlugin, withUk Tailwind wrapper, backend adapters | f348730 | ssr-plugin.tsx, adapters/express.ts, adapters/fastify.ts, adapters/hono.ts, handler.ts, byos.ts, tailwind.ts, tsup configs, package.json files |
| 3 | Build verification — ProgressGranularity type, fix tests | 24ed905 | core/types.ts, use-upload-kit.test.ts |

## Features Implemented

### 1. config.mode (manual/auto)
- `UploadButton`: `mode: 'auto'` (default) uploads immediately on file selection. `mode: 'manual'` stages the file and shows "Upload [filename]" with a clear button; second click uploads.
- `UploadDropzone`: `mode: 'manual'` (default, matches UploadThing UX) stages files and renders a "Upload N file(s)" submit button. `mode: 'auto'` uploads immediately on drop/select.
- `UploadModal`: forwards `config` to inner `UploadDropzone`.

### 2. onBeforeUploadBegin callback
- Both `UploadButton` and `UploadDropzone` accept `onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>`.
- Fires after client-side validation, before upload begins.
- Empty array return cancels upload silently. Thrown error calls `onUploadError`.
- Allows file renaming/modification before upload.

### 3. data-uk-element and data-state attributes
- All 5 components have `data-uk-element` on every rendered element.
- Stateful elements have `data-state` with correct lifecycle values.
- `UploadButton`: `data-state` values: `ready`, `uploading`, `success`, `error` (replaces `data-status`).
- `UploadDropzone` container: composite `data-state`: `idle`, `dragging`, `uploading`, `success`, `error`.
- Each file item in dropzone has `data-state` matching its upload status.

### 4. Progress granularity
- `ProxyUploadOptions` gains `progressGranularity?: 'coarse' | 'fine' | 'all'`.
- `'coarse'` (default): fires at every 10% threshold crossing.
- `'fine'`: fires at every 2% threshold crossing.
- `'all'`: fires on every XHR progress event (original behavior).
- Always fires 100% on completion regardless of granularity.
- `useUploadKit` updated to accept and forward `progressGranularity`.

### 5. NextSSRPlugin
- `NextSSRPlugin` renders `<script type="application/json" id="__uploadkit-ssr">` with serialized router config.
- `extractRouterConfig` extracts `maxFileSize`/`maxFileCount`/`allowedTypes` from a `FileRouter`.
- Exported from `@uploadkit/next` main entry and accessible via new `./ssr` subpath export.

### 6. withUk Tailwind wrapper
- `withUk(config)` wraps any Tailwind config to add UploadKit content path and custom variants.
- Element variants: `uk-button`, `uk-container`, `uk-label`, `uk-upload-icon`, `uk-allowed-content`, `uk-file-item`, `uk-progress-bar`, `uk-preview`, `uk-modal`, `uk-submit`.
- State variants: `uk-ready`, `uk-idle`, `uk-uploading`, `uk-success`, `uk-error`, `uk-dragging`.
- Exported from `@uploadkit/react` main entry and `@uploadkit/react/tailwind` subpath.

### 7. Backend adapters
- `createExpressHandler`: bridges Express req/res to Web Request/Response.
- `createFastifyHandler`: bridges Fastify req/reply to Web Request/Response.
- `createHonoHandler`: passes through native Web Request/Response (minimal bridging).
- All exported as subpath exports: `@uploadkit/next/express`, `@uploadkit/next/fastify`, `@uploadkit/next/hono`.

## Intentional Behavior Changes

1. **UploadDropzone defaults to `mode: 'manual'`** — This IS a behavior change. Files are now staged by default and require the user to click "Upload N file(s)" to begin. Matches UploadThing's UX. Existing consumers that relied on immediate upload on drop should set `config={{ mode: 'auto' }}`.

2. **`data-status` renamed to `data-state` on UploadButton** — Minor breaking change for anyone targeting `[data-status]` in CSS. The CSS in `styles.css` has been updated to use `[data-state=...]` selectors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `server-only` also in byos.ts**
- **Found during:** Task 2 — after removing from handler.ts, TypeScript surfaced the same import in byos.ts.
- **Fix:** Replaced `import 'server-only'` with comment `// Server-side only — do not import in browser code` in byos.ts.
- **Files modified:** `packages/next/src/byos.ts`
- **Commit:** f348730

**2. [Rule 1 - Bug] Missing `jsx` compiler option in packages/next/tsconfig.json**
- **Found during:** Task 2 typecheck — ssr-plugin.tsx uses JSX but tsconfig lacked `"jsx"` setting.
- **Fix:** Added `"jsx": "react-jsx"` to packages/next/tsconfig.json.
- **Files modified:** `packages/next/tsconfig.json`
- **Commit:** f348730

**3. [Rule 1 - Bug] `exactOptionalPropertyTypes` error in Express/Fastify adapters**
- **Found during:** Task 2 typecheck — `body: string | undefined` not assignable to `BodyInit | null`.
- **Fix:** Used conditional spread `...(hasBody ? { body: ... } : {})` pattern.
- **Files modified:** `adapters/express.ts`, `adapters/fastify.ts`
- **Commit:** f348730

**4. [Rule 1 - Bug] `params[0]` typed as `string | string[]` in Express adapter**
- **Found during:** Task 2 typecheck — `.split()` not available on `string[]`.
- **Fix:** Added `Array.isArray(rawParam) ? rawParam.join('/') : rawParam` guard.
- **Files modified:** `packages/next/src/adapters/express.ts`
- **Commit:** f348730

**5. [Rule 1 - Bug] Test mock missing `createProxyClient`, wrapper using old `apiKey` prop**
- **Found during:** Task 3 — test failures after refactor to proxy client pattern.
- **Fix:** Added `createProxyClient` and `ProxyUploadKitClient` to mock; changed `apiKey` to `endpoint` in test wrapper.
- **Files modified:** `packages/react/tests/use-upload-kit.test.ts`
- **Commit:** 24ed905

**6. [Rule 2 - Missing critical functionality] `useUploadKit.upload()` didn't accept `progressGranularity`**
- **Found during:** Task 1 implementation — `upload()` signature was `(file, metadata)` only.
- **Fix:** Added optional `extraOpts?: { progressGranularity? }` third parameter to `upload()` in `use-upload-kit.ts`.
- **Files modified:** `packages/react/src/use-upload-kit.ts`
- **Commit:** 3dfb6c8

## Build Verification

- `pnpm turbo build --filter=@uploadkit/core --filter=@uploadkit/react --filter=@uploadkit/next` — all 4 build tasks successful (3 + shared dependency).
- All new subpath dist files verified present.
- `pnpm --filter @uploadkit/react test` — 8/8 tests passing.
- `pnpm --filter @uploadkit/next typecheck` — clean.
- `pnpm --filter @uploadkit/react typecheck` — clean.
- `pnpm --filter @uploadkit/core typecheck` — clean.

## Known Stubs

None — all 7 features are fully wired. The backend adapters use real route bridging (not mock responses). The SSR plugin serializes actual router config. The Tailwind wrapper registers real CSS variants.

## Self-Check: PASSED

- `packages/next/dist/ssr-plugin.js` — FOUND
- `packages/next/dist/ssr-plugin.d.ts` — FOUND
- `packages/next/dist/adapters/express.js` — FOUND
- `packages/next/dist/adapters/fastify.js` — FOUND
- `packages/next/dist/adapters/hono.js` — FOUND
- `packages/react/dist/tailwind.mjs` — FOUND
- `packages/react/dist/tailwind.d.ts` — FOUND
- Commit 3dfb6c8 — FOUND
- Commit f348730 — FOUND
- Commit 24ed905 — FOUND
