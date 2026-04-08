---
phase: "05"
plan: "01"
subsystem: "@uploadkit/react"
tags: [react, sdk, css, theming, context, hooks, build]
dependency_graph:
  requires:
    - "04-02: @uploadkit/core UploadKitClient + createUploadKit factory"
  provides:
    - "UploadKitProvider context with stable UploadKitClient ref"
    - "useUploadKit headless upload state machine hook"
    - "styles.css complete CSS variable theming system"
    - "Build emitting ESM (index.mjs), CJS (index.js), types (index.d.ts), styles (styles.css)"
  affects:
    - "05-02: UploadButton depends on useUploadKit + styles.css"
    - "05-03: UploadDropzone depends on UploadKitProvider context + styles.css"
    - "05-04: UploadModal + FileList + FilePreview depend on all foundations"
tech_stack:
  added:
    - "react/jsx-runtime (peer dep, zero bundle cost)"
    - "tsup CSS entry point support (src/styles.css -> dist/styles.css)"
  patterns:
    - "useRef lazy init for stable SDK client across re-renders"
    - "useReducer state machine for upload lifecycle"
    - "AbortController for upload cancellation"
    - "exactOptionalPropertyTypes conditional spread for optional props"
    - "CSS custom properties for zero-JS theming"
key_files:
  created:
    - packages/react/src/styles.css
    - packages/react/src/context.tsx
    - packages/react/src/use-upload-kit.ts
    - packages/react/src/utils/merge-class.ts
    - packages/react/src/utils/format-bytes.ts
  modified:
    - packages/react/src/index.ts
    - packages/react/package.json
    - packages/react/tsup.config.ts
    - packages/react/tsconfig.json
decisions:
  - "useRef (not useState/useMemo) for UploadKitClient: guarantees single instantiation regardless of React Strict Mode double-invocation or parent re-renders"
  - "dist/index.mjs for ESM, dist/index.js for CJS: tsup with CSS entry + splitting=true outputs this naming convention; package.json exports updated accordingly"
  - "tsconfig.json overrides rootDir/outDir locally: base tsconfig.library.json rootDir is relative to config package, not consumer packages; explicit override required for tsc --noEmit to resolve correctly"
  - "styles.css reduced-motion uses explicit class list instead of .uk-* glob: esbuild/tsup does not support CSS nesting with * wildcard in attribute selector context"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-08T17:21:37Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 4
---

# Phase 05 Plan 01: React SDK Foundation Summary

**One-liner:** `@uploadkit/react` foundation — UploadKitProvider context with stable client ref, useUploadKit reducer-based upload state machine, and complete CSS variable theming system with dark mode, reduced motion, and all component base styles.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Build config, styles.css, utility helpers | `1cf1da3` | styles.css, merge-class.ts, format-bytes.ts, tsup.config.ts, package.json |
| 2 | UploadKitProvider context and useUploadKit hook | `5cdf128` | context.tsx, use-upload-kit.ts, index.ts, tsconfig.json |

## What Was Built

### styles.css (6.7 KB minified)
Complete CSS theming system with:
- **Token layer**: 12 `--uk-*` custom properties in `:root` (light defaults)
- **Dark mode auto**: `@media (prefers-color-scheme: dark)` overrides for bg, border, text
- **Dark mode explicit**: `[data-theme="dark"]` placed after media block for correct specificity
- **Light mode explicit**: `[data-theme="light"]` for runtime override
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` with explicit class list (esbuild CSS nesting limitation)
- **Keyframes**: `uk-progress-indeterminate`, `uk-progress-stripe`, `uk-modal-enter`, `uk-modal-exit`, `uk-fade-in`
- **Base component styles**: `.uk-button` (+ variants: outline, ghost, sm/md/lg, status states), `.uk-dropzone`, `.uk-progress`, `.uk-file-item`, `.uk-file-list`, `.uk-error-toast`, `.uk-modal`, `.uk-preview`

### UploadKitProvider (context.tsx)
- Creates `UploadKitClient` once via `useRef` lazy init pattern — survives React Strict Mode, parent re-renders, and concurrent renders
- `baseUrl` uses conditional spread `...(baseUrl !== undefined ? { baseUrl } : {})` for `exactOptionalPropertyTypes` compliance
- Security T-05-01: API key lives in `UploadKitClient#apiKey` private class field — never in DOM, never in React state

### useUploadKit (use-upload-kit.ts)
- Five-state `useReducer` machine: `idle → uploading → success|error`, with `RESET` returning to initial state
- `AbortController` stored in state for cancellation — security T-05-03
- `abort()` cancels in-progress upload and resets state; `AbortError` caught silently (user intent, not an error)
- Returns: `upload`, `abort`, `reset`, `status`, `progress`, `error`, `result`, `isUploading`
- `metadata` uses conditional spread for `exactOptionalPropertyTypes` compliance (same pattern as Phase 3 upload routes)

### Build output
| File | Format | Size |
|------|--------|------|
| dist/index.mjs | ESM | 3.49 KB |
| dist/index.js | CJS | 4.38 KB |
| dist/index.d.ts | Types | 1.65 KB |
| dist/styles.css | CSS | 6.71 KB |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exactOptionalPropertyTypes violation in use-upload-kit.ts**
- **Found during:** Task 2 DTS build
- **Issue:** `metadata?: Record<string, unknown>` passed directly to `client.upload()` — `undefined` not assignable to `Record<string, unknown>` under `exactOptionalPropertyTypes: true`
- **Fix:** `...(metadata !== undefined ? { metadata } : {})` conditional spread
- **Files modified:** `packages/react/src/use-upload-kit.ts`
- **Commit:** `5cdf128`

**2. [Rule 1 - Bug] exactOptionalPropertyTypes violation in context.tsx**
- **Found during:** Task 2 DTS build (second error after fix #1)
- **Issue:** `createUploadKit({ apiKey, baseUrl })` — `baseUrl: string | undefined` not assignable to `baseUrl?: string` under exactOptionalPropertyTypes
- **Fix:** `...(baseUrl !== undefined ? { baseUrl } : {})` conditional spread
- **Files modified:** `packages/react/src/context.tsx`
- **Commit:** `5cdf128`

**3. [Rule 1 - Bug] tsconfig rootDir mismatch breaking typecheck**
- **Found during:** Task 2 typecheck
- **Issue:** `tsconfig.library.json` base sets `rootDir: ./src` relative to `packages/config/typescript/`, which resolves to the wrong directory when extended by `packages/react/tsconfig.json`. All packages have this pre-existing issue; fixed here for `@uploadkit/react`.
- **Fix:** Added explicit `rootDir: ./src` and `outDir: ./dist` overrides to `packages/react/tsconfig.json`
- **Files modified:** `packages/react/tsconfig.json`
- **Commit:** `5cdf128`

**4. [Rule 1 - Bug] reduced-motion CSS wildcard not supported by esbuild**
- **Found during:** Task 1 build (warning, not error)
- **Issue:** `.uk-*` wildcard selector in CSS causes esbuild syntax warning — not valid in this context
- **Fix:** Replaced wildcard with explicit list of all `.uk-*` component classes
- **Files modified:** `packages/react/src/styles.css`
- **Commit:** `1cf1da3`

**5. [Rule 1 - Bug] package.json ESM/CJS paths incorrect**
- **Found during:** Task 1 verification
- **Issue:** Original `package.json` had `"import": "./dist/index.js"` but tsup with CSS entry + splitting outputs ESM as `index.mjs` and CJS as `index.js`
- **Fix:** Updated `"import": "./dist/index.mjs"`, `"require": "./dist/index.js"`, `"module": "./dist/index.mjs"`
- **Files modified:** `packages/react/package.json`
- **Commit:** `1cf1da3`

## Known Stubs

None — this plan establishes the foundation layer with no UI rendering. No placeholder data flows to consumers.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. API key handling (T-05-01) and AbortController (T-05-03) mitigations were implemented as required.

## Self-Check: PASSED
