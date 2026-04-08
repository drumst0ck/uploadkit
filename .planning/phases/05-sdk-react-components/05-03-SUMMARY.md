---
phase: "05"
plan: "03"
subsystem: "@uploadkit/react"
tags: [react, sdk, modal, dialog, file-list, file-preview, canvas, thumbnail, hooks]
dependency_graph:
  requires:
    - "05-01: UploadKitProvider context, styles.css with uk-modal/uk-preview/uk-file-list CSS"
    - "05-02: UploadDropzone component (composed inside UploadModal)"
    - "04-01: @uploadkit/core UploadResult type"
  provides:
    - "UploadModal with native HTMLDialogElement, showModal()/close(), ESC + backdrop click"
    - "FilePreview with client-side canvas thumbnails for images and video first-frame capture"
    - "FileList displaying UploadResult[] with previews, name, size, and delete action"
    - "useThumbnail hook with IntersectionObserver lazy generation and URL.revokeObjectURL cleanup"
  affects:
    - "05-04: Final plan can use these components directly"
    - "Downstream apps: UploadModal, FileList, FilePreview exported from @uploadkit/react"
tech_stack:
  added: []
  patterns:
    - "Native HTMLDialogElement imperative API (showModal/close) driven by React state via useEffect"
    - "exactOptionalPropertyTypes conditional spread for all optional props (consistent with prior plans)"
    - "IntersectionObserver for lazy thumbnail generation (visible-only generation)"
    - "Canvas API: drawImage for video first-frame capture at currentTime=0"
    - "URL.createObjectURL + revokeObjectURL lifecycle for memory-safe blob URLs"
    - "Inner component split (FilePreviewFromFile) to ensure hooks run unconditionally past type guard"
key_files:
  created:
    - packages/react/src/components/upload-modal.tsx
    - packages/react/src/components/file-preview.tsx
    - packages/react/src/components/file-list.tsx
    - packages/react/src/hooks/use-thumbnail.ts
  modified:
    - packages/react/src/index.ts
    - packages/react/src/styles.css
decisions:
  - "Native <dialog> over div overlay: built-in focus trap, ::backdrop, aria-modal semantics with zero JS overhead"
  - "onCancel e.preventDefault() + call onClose(): prevents native ESC close from bypassing React state"
  - "Inner FilePreviewFromFile component: TypeScript type guard (isUploadResult) at top of FilePreview means hooks would run conditionally — inner component splits the two paths so useThumbnail is always called unconditionally"
  - "URL.createObjectURL for images (not canvas resize): sufficient for 48px display; canvas only needed for video frame capture"
  - "exactOptionalPropertyTypes conditional spread in UploadModal: all optional props (accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, appearance sub-keys) use conditional spread to satisfy strict TypeScript"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-08T17:45:00Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 05 Plan 03: UploadModal, FileList, and FilePreview Summary

**One-liner:** UploadModal using native HTMLDialogElement with showModal()/close() and CSS animation, FilePreview with canvas thumbnail generation (images via createObjectURL, video first-frame via drawImage), and FileList displaying UploadResult[] with delete actions — all exported from @uploadkit/react.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | UploadModal with native dialog element | `9e0fb47` | upload-modal.tsx, index.ts, styles.css |
| 2 | FileList, FilePreview, and canvas thumbnail hook | `de0ac9b` | file-list.tsx, file-preview.tsx, use-thumbnail.ts, index.ts |

## What Was Built

### UploadModal (upload-modal.tsx)

Modal overlay using the native `<dialog>` HTML element — not a div with z-index tricks.

- `useRef<HTMLDialogElement>` + `useEffect` watching `open` prop:
  - `open=true` → `dialogRef.current.showModal()` (activates ::backdrop, focus trap, aria-modal)
  - `open=false` → `dialogRef.current.close()`
- `onCancel` handler: `e.preventDefault()` stops native ESC close, then calls `onClose()` so React state stays in control
- Backdrop click detection: `e.target === dialogRef.current` — true only when clicking the dialog backdrop area, not its content
- Composes `UploadDropzone` inside — full drag-and-drop upload support with no duplication
- Animation: CSS `uk-modal-enter` keyframe from styles.css (200ms scale + opacity) — no JS animation
- Added `.uk-modal__title` CSS rule to styles.css (18px, 600 weight, var(--uk-text), var(--uk-font))
- `aria-label` on dialog element satisfies WCAG 2.1 AA (REACT-05)

### useThumbnail (use-thumbnail.ts)

Client-side thumbnail generation hook with lazy loading and memory management:

- **Images**: `URL.createObjectURL(file)` — fast blob URL, no canvas overhead for 48px display
- **Videos**: Detached `<video>` element with `muted=true`, `playsInline=true`:
  - `loadedmetadata` event → set `currentTime = 0`
  - `seeked` event → 160px-wide canvas with proportional height, `drawImage`, `toDataURL('image/jpeg', 0.8)`
  - `URL.revokeObjectURL` called after canvas capture (T-05-08)
- **Other files**: returns `{ thumbnailUrl: null, isGenerating: false }` — caller shows type icon
- **IntersectionObserver**: when `containerRef` is provided, generation deferred until element is 10% visible in viewport — prevents generating thumbnails for off-screen items in long lists (T-05-08 DoS mitigation)
- **Cleanup**: `URL.revokeObjectURL` for blob: URLs in effect cleanup — no memory accumulation
- **Error handling**: canvas errors caught silently (tainted canvas, video decode failures) — graceful fallback to null

### FilePreview (file-preview.tsx)

Renders a 48×48 thumbnail for either a `File` object or a completed `UploadResult`:

- Type guard `isUploadResult()` checks for `url` property to distinguish the two input types
- `UploadResult` → renders `<img src={result.url}>` directly (server-trusted URL, T-05-07)
- `File` (image/video) → `useThumbnail` hook via inner `FilePreviewFromFile` component
- `File` (other) → `getFileTypeIcon(file.type)` SVG via `dangerouslySetInnerHTML`
- Skeleton placeholder (CSS `uk-border` background) shown during video frame capture
- Inner component split (`FilePreviewFromFile`) ensures `useThumbnail` hook runs unconditionally — React hooks rules compliance when a type guard is at the top of the parent component

### FileList (file-list.tsx)

Displays a list of completed `UploadResult[]` with rich file previews:

- Maps over `files` array — each item: `FilePreview` thumbnail + name (truncated with ellipsis) + formatted size
- `onDelete` is optional — delete button rendered only when prop is provided
- Delete button: `aria-label="Delete {filename}"` for accessibility, X SVG icon inline
- Empty state: "No files uploaded" message when `files.length === 0`
- Full `appearance` customization for every sub-element

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exactOptionalPropertyTypes violations in UploadModal**
- **Found during:** Task 1 DTS build (two separate errors)
- **Issue #1:** Appearance sub-keys (`container`, `label`, etc.) passed as `string | undefined` to UploadDropzone `appearance` prop — not assignable under `exactOptionalPropertyTypes: true`
- **Issue #2:** Optional UploadDropzone props (`accept`, `maxSize`, `maxFiles`, `metadata`, `onUploadComplete`, `onUploadError`) passed as `T | undefined` — same issue
- **Fix:** Conditional spread for all optional values: `...(accept !== undefined ? { accept } : {})`
- **Files modified:** `packages/react/src/components/upload-modal.tsx`
- **Commit:** `9e0fb47`

**2. [Rule 1 - Bug] Duplicate useUploadKit export in index.ts**
- **Found during:** Task 2 build (esbuild error)
- **Issue:** My edit added `export { useUploadKit }` to the hooks section, but it was already exported on line 6. Esbuild caught the duplicate export.
- **Fix:** Removed the duplicate line from the hooks section
- **Files modified:** `packages/react/src/index.ts`
- **Commit:** `de0ac9b`

**3. [Rule 1 - Bug] exactOptionalPropertyTypes violation in FilePreview inner component call**
- **Found during:** Task 2 DTS build
- **Issue:** `FilePreviewFromFile` called with `className={className}` and `appearance={appearance}` where both may be `undefined` — not assignable to optional props under `exactOptionalPropertyTypes: true`
- **Fix:** Conditional spread: `{...(className !== undefined ? { className } : {})}` and same for `appearance`
- **Files modified:** `packages/react/src/components/file-preview.tsx`
- **Commit:** `de0ac9b`

## Known Stubs

None — all components render real data. FilePreview generates real thumbnails from File objects and renders server URLs from UploadResult. FileList renders actual file metadata. No placeholder data.

## Threat Surface Scan

All threat mitigations from the plan's threat model were implemented:

| Threat | Mitigation |
|--------|-----------|
| T-05-07: UploadResult.url in img src | UploadResult.url comes from UploadKit API (trusted); File thumbnails use blob: URLs (same-origin) |
| T-05-08: useThumbnail DoS via large file lists | IntersectionObserver defers generation to visible items; revokeObjectURL prevents memory accumulation |
| T-05-09: dialog content disclosure | Native dialog inert behavior prevents background interaction by design |

No new threat surface introduced beyond the plan's threat model.

## Self-Check: PASSED
