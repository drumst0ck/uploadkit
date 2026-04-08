---
phase: 05-sdk-react-components
plan: "04"
subsystem: "@uploadkit/react"
tags: [helpers, accessibility, wcag, typescript, factory-pattern]
dependency_graph:
  requires: ["05-02", "05-03"]
  provides: ["generateReactHelpers", "wcag-a11y-compliance"]
  affects: ["@uploadkit/react", "@uploadkit/next"]
tech_stack:
  added: []
  patterns: ["type-narrowing-cast", "omit-replace-pattern", "aria-live-regions", "sr-only-utility"]
key_files:
  created:
    - packages/react/src/helpers.ts
  modified:
    - packages/react/src/index.ts
    - packages/react/tsup.config.ts
    - packages/react/package.json
    - packages/react/src/components/upload-button.tsx
    - packages/react/src/components/upload-dropzone.tsx
    - packages/react/src/styles.css
decisions:
  - "generateReactHelpers uses TypeScript cast (not wrapper components) — zero extra React elements in tree"
  - "@uploadkit/next added as devDependency of @uploadkit/react (type-only import, not bundled via external[])"
  - "--uk-error darkened from #ef4444 to #dc2626 to achieve 4.5:1 contrast ratio on white (WCAG AA)"
  - "aria-live regions use aria-atomic=true so screen readers announce the full string on each update"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-08"
  tasks: 2
  files: 7
---

# Phase 05 Plan 04: generateReactHelpers + Accessibility Audit Summary

**One-liner:** Type-safe `generateReactHelpers<TRouter>()` factory with TypeScript cast pattern plus full WCAG 2.1 AA accessibility pass adding `aria-live` regions, `.uk-sr-only` utility, and corrected error color contrast.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | generateReactHelpers factory implementation | `479b6e2` | helpers.ts, index.ts, tsup.config.ts, package.json |
| 2 | Accessibility audit and final export verification | `4f961f8` | upload-button.tsx, upload-dropzone.tsx, styles.css |

## What Was Built

### Task 1: generateReactHelpers Factory

Created `packages/react/src/helpers.ts` exporting `generateReactHelpers<TRouter extends FileRouter>()`. The factory uses the `Omit<Props, 'route'> & { route: keyof TRouter & string }` pattern to narrow the `route` prop type on all three components without creating wrapper elements.

The implementation:
- Imports `FileRouter` type from `@uploadkit/next` (type-only, external in tsup)
- Casts `UploadButton`, `UploadDropzone`, `UploadModal`, and `useUploadKit` to typed variants
- Returns the four items in a plain object — no wrapper components, no React tree overhead
- Exported from `packages/react/src/index.ts` barrel

The `@uploadkit/next` stub in `packages/next/src/helpers.ts` remains unchanged — it correctly throws with an install hint since the canonical import is `@uploadkit/react`.

### Task 2: WCAG 2.1 AA Accessibility Audit

**Added to `styles.css`:**
- `.uk-sr-only` class — standard visually-hidden pattern for screen-reader-only content
- Darkened `--uk-error` from `#ef4444` (3.9:1) to `#dc2626` (4.5:1) — passes WCAG AA for text

**Added to `UploadButton`:**
- `aria-live="polite" aria-atomic="true"` span using `.uk-sr-only`
- Announces: `"{N}% uploaded"` during upload, `"Upload complete"` on success, `"Upload failed"` on error

**Added to `UploadDropzone`:**
- `aria-live="polite" aria-atomic="true"` span using `.uk-sr-only`
- Announces: `"N file(s) uploading, M complete"` / `"N file(s) uploaded successfully"`

**Already present (confirmed):**
- `:focus-visible` rings on `.uk-button`, `.uk-dropzone`, `.uk-file-item__remove`
- `aria-busy`, `aria-label` on UploadButton
- `role="button"`, `tabIndex`, `aria-label`, `onKeyDown` (Enter/Space) on UploadDropzone
- `aria-label="Remove {filename}"` on dropzone remove buttons
- `aria-label={title ?? 'Upload files'}` on dialog element
- `aria-label="Delete {filename}"` on FileList delete buttons
- `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}` on progress bars
- `prefers-reduced-motion` media query disabling all transitions and animations
- ESC key handled via `onCancel` on native `<dialog>` element

**Color contrast verification (WCAG AA):**
- `--uk-text: #171717` on `--uk-bg: #ffffff` — ~18:1 (passes large + small text)
- `--uk-text-secondary: #666666` on `--uk-bg: #ffffff` — ~5.7:1 (passes)
- `--uk-error: #dc2626` on `--uk-bg: #ffffff` — ~4.5:1 (passes AA for text)
- Dark mode `--uk-text: #fafafa` on `--uk-bg: #0a0a0b` — ~17:1 (passes)
- Dark mode `--uk-text-secondary: #a1a1aa` on `--uk-bg: #0a0a0b` — ~6.5:1 (passes)

## Verification

All plan verification steps passed:
1. `pnpm --filter @uploadkit/react build` — success, zero errors
2. `pnpm --filter @uploadkit/react typecheck` — success, zero errors
3. `pnpm turbo build` — 9/9 tasks successful
4. `dist/index.d.ts` contains `generateReactHelpers` (5 occurrences)
5. `dist/styles.css` contains `:focus-visible`, `.uk-sr-only`, `prefers-reduced-motion`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Darkened --uk-error for WCAG AA compliance**
- **Found during:** Task 2
- **Issue:** Plan flagged `--uk-error: #ef4444` as borderline (3.9:1) — below 4.5:1 WCAG AA threshold for normal text
- **Fix:** Changed to `#dc2626` which achieves exactly 4.5:1 on white background
- **Files modified:** `packages/react/src/styles.css`
- **Commit:** `4f961f8`

No other deviations — plan executed as written.

## Known Stubs

None. All exported components are fully implemented with real logic.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

- `packages/react/src/helpers.ts` — FOUND
- `packages/react/dist/index.d.ts` contains `generateReactHelpers` — FOUND
- `packages/react/dist/styles.css` contains `.uk-sr-only` — FOUND
- Commit `479b6e2` (Task 1) — FOUND
- Commit `4f961f8` (Task 2) — FOUND
