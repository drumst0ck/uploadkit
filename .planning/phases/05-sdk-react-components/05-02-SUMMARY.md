---
phase: "05"
plan: "02"
subsystem: "@uploadkit/react"
tags: [react, sdk, components, upload-button, upload-dropzone, drag-and-drop, accessibility, typescript]
dependency_graph:
  requires:
    - "05-01: UploadKitProvider, useUploadKit hook, styles.css, mergeClass, formatBytes utilities"
    - "04-01: @uploadkit/core UploadKitClient with upload() and AbortController support"
  provides:
    - "UploadButton: styled button with idle/uploading/success/error state cycling and progress bar"
    - "UploadDropzone: drag-and-drop zone with multi-file queue, per-file progress, rejection toasts"
    - "useDragState: counter-based drag tracking hook (no child element flicker)"
    - "useAutoDismiss: generic auto-removing list hook (5s default)"
    - "file-icons.ts: getFileTypeIcon + getUploadIcon inline SVG helpers"
  affects:
    - "05-03: UploadModal can share useDragState and useAutoDismiss"
    - "05-04: FileList/FilePreview can reuse file-icons.ts"
tech_stack:
  added: []
  patterns:
    - "forwardRef for all public components (React 18 compat, Pitfall 7)"
    - "Counter technique for drag state (avoids child element dragenter/dragleave flicker)"
    - "useEffect for callback wiring (onUploadComplete / onUploadError) — avoids stale closure bugs"
    - "Parallel batch uploads (3 concurrent) with individual AbortController per file"
    - "exactOptionalPropertyTypes: T | undefined on optional fields in internal types"
key_files:
  created:
    - packages/react/src/components/upload-button.tsx
    - packages/react/src/components/upload-dropzone.tsx
    - packages/react/src/hooks/use-drag-state.ts
    - packages/react/src/hooks/use-auto-dismiss.ts
    - packages/react/src/utils/file-icons.ts
  modified:
    - packages/react/src/index.ts
decisions:
  - "forwardRef on both components: required for React 18 compatibility and composability with third-party form libs"
  - "useDragState uses integer counter not boolean: prevents dragenter/dragleave flicker when cursor moves across child elements"
  - "UploadDropzone calls client.upload() directly (not useUploadKit): required to manage independent state per file in the queue"
  - "Batch size of 3 concurrent uploads: balances throughput with DoS mitigation (T-05-05)"
  - "exactOptionalPropertyTypes fix: FileEntry optional fields typed as T | undefined to allow explicit clearing in state updaters"
metrics:
  duration: "3m"
  completed: "2026-04-08"
  tasks: 2
  files: 6
---

# Phase 05 Plan 02: UploadButton and UploadDropzone Summary

**One-liner:** UploadButton (stateful file picker with progress bar) and UploadDropzone (counter-based drag-and-drop, multi-file queue, auto-dismissing rejection toasts) implemented as forwardRef components using CSS variable theming.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | UploadButton with states, variants, and file-icons utility | `56be8fd` | upload-button.tsx, file-icons.ts, index.ts |
| 2 | UploadDropzone with drag-and-drop, multi-file, error toasts | `0b93e62` | upload-dropzone.tsx, use-drag-state.ts, use-auto-dismiss.ts, index.ts |

## What Was Built

### UploadButton (`packages/react/src/components/upload-button.tsx`)

A `forwardRef` button component wrapping `useUploadKit`. State cycling:
- **idle**: cloud-upload icon + "Upload file"
- **uploading**: spinning icon + "Uploading X%" + progress bar below button
- **success**: check icon + "Uploaded" → auto-resets to idle after 3s
- **error**: X icon + "Failed" (stays until user resets)

Props: `route`, `accept`, `maxSize`, `metadata`, `onUploadComplete`, `onUploadError`, `variant` (default/outline/ghost), `size` (sm/md/lg), `disabled`, `className`, `appearance` (button/progressBar/progressText).

Accessibility: `aria-busy`, `aria-label` with live progress, `role="progressbar"` with `aria-valuenow/min/max`, hidden `<input type="file">`.

### UploadDropzone (`packages/react/src/components/upload-dropzone.tsx`)

A `forwardRef` drag-and-drop zone using `client.upload()` directly (not `useUploadKit`) to independently manage each file's progress state. Features:

- **Counter drag tracking** via `useDragState`: incrementing on `dragenter`, decrementing on `dragleave` — `isDragging = counter > 0` prevents flicker when the cursor crosses child elements
- **File validation**: MIME type (wildcard glob match e.g. `image/*`) and size checked client-side; rejected files produce auto-dismissing error toasts
- **Concurrent batch uploads**: up to 3 files in parallel with individual `AbortController` per file; remove button aborts in-progress uploads
- **Per-file status**: each file entry shows name, formatted size, progress bar (uploading), success/error icon, remove button (idle/uploading only)
- **Error toasts**: `.uk-error-toast` with `role="alert"`, auto-dismiss after 5s via `useAutoDismiss`, manual dismiss button

Props: `route`, `accept`, `maxSize`, `maxFiles`, `metadata`, `onUploadComplete`, `onUploadError`, `disabled`, `className`, `appearance` (container/label/icon/fileItem/progressBar/button).

Accessibility: `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` (Enter/Space triggers file picker).

### useDragState (`packages/react/src/hooks/use-drag-state.ts`)

Counter-based hook returning `{ isDragging, handlers }`. Handlers spread directly onto the dropzone element.

### useAutoDismiss (`packages/react/src/hooks/use-auto-dismiss.ts`)

Generic hook `useAutoDismiss<T extends { id: string }>(duration?)` returning `[items, addItem, removeItem]`. Each item gets an auto-clear timer; all timers cleaned up on unmount.

### file-icons.ts (`packages/react/src/utils/file-icons.ts`)

`getFileTypeIcon(mimeType)` and `getUploadIcon()` returning 24×24 inline SVG strings with `currentColor` for CSS theming. Covers image, video, audio, PDF, archive, and generic fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `exactOptionalPropertyTypes` incompatibility in FileEntry**
- **Found during:** Task 2 DTS build
- **Issue:** `FileEntry` optional fields (`result?`, `error?`, `abortController?`) typed without `| undefined` — TypeScript 5.x strict mode rejects setting them to `undefined` in state updater spreads
- **Fix:** Declared all three as `T | undefined` (e.g. `abortController?: AbortController | undefined`) to satisfy `exactOptionalPropertyTypes: true`
- **Files modified:** `packages/react/src/components/upload-dropzone.tsx`
- **Commit:** `0b93e62` (included in Task 2 commit)

## Known Stubs

None. Both components are fully wired to `useUploadKit` / `client.upload()` with real progress and state management.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. File type validation is explicitly UX-only (T-05-06 accepted); server-side validation remains the authoritative check.

## Self-Check: PASSED

- `packages/react/src/components/upload-button.tsx` — EXISTS
- `packages/react/src/components/upload-dropzone.tsx` — EXISTS
- `packages/react/src/hooks/use-drag-state.ts` — EXISTS
- `packages/react/src/hooks/use-auto-dismiss.ts` — EXISTS
- `packages/react/src/utils/file-icons.ts` — EXISTS
- Commit `56be8fd` — EXISTS
- Commit `0b93e62` — EXISTS
- `dist/index.d.ts` exports `UploadButton` and `UploadDropzone` — VERIFIED
