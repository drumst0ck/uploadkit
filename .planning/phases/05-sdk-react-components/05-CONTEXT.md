# Phase 5: SDK React Components - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

`@uploadkit/react` — premium React upload components (UploadButton, UploadDropzone, UploadModal, FileList, FilePreview), useUploadKit headless hook, UploadKitProvider, generateReactHelpers runtime implementation, CSS variables theming with dark mode, and WCAG 2.1 AA accessibility. Ships as `@uploadkit/react/styles.css` + ESM/CJS.

</domain>

<decisions>
## Implementation Decisions

### Component Styling
- **D-01:** Vanilla CSS file shipped as `@uploadkit/react/styles.css`. Developer imports once. No CSS-in-JS runtime. Zero JS animation dependency — CSS transitions only.
- **D-02:** Customization via `className` prop (outer container) + `appearance` prop for sub-elements: `appearance={{ button: '...', container: '...', progressBar: '...' }}`. Tailwind merge compatible.
- **D-03:** Opinionated beautiful defaults — components look premium out of the box with CSS custom properties. No styling required from the developer unless they want to customize.

### Animation Design
- **D-04:** CSS transitions only — no motion/framer-motion dependency. `transition: all 200ms ease-out` for state changes. CSS `@keyframes` for progress bar animation.
- **D-05:** Upload progress: thin bar below component + percentage text. Linear-style loading bars.
- **D-06:** UploadModal: scale(0.95) → scale(1) + opacity fade on enter, reverse on exit. Backdrop blur fade. 200ms ease-out.

### Dropzone Behavior
- **D-07:** Multi-file: stacked list below the dropzone. Each file shows name, size, thin progress bar, and remove button.
- **D-08:** File rejection: inline error toast below dropzone — "photo.exe rejected — .exe files not allowed". Red text, auto-dismiss after 5s.
- **D-09:** Client-side thumbnails via canvas + createObjectURL. Images: render to canvas for thumbnail. Videos: capture first frame. Others: file type icon. All client-side, no server round-trip.

### Theming System
- **D-10:** CSS custom properties with `--uk-` prefix: `--uk-primary`, `--uk-bg`, `--uk-border`, `--uk-text`, `--uk-text-secondary`, `--uk-success`, `--uk-error`, `--uk-radius`.
- **D-11:** Dark mode via `prefers-color-scheme` media query (default) + `[data-theme="dark"]` attribute override on any parent element. Components respond to both.

### Claude's Discretion
- Internal component state management (useReducer vs useState)
- FileList/FilePreview component internal structure
- Accessibility implementation details (focus trap, aria attributes)
- generateReactHelpers runtime implementation (wrapping core SDK)
- UploadKitProvider context design
- CSS specificity strategy for styles.css
- Component variant implementation (size: sm/md/lg, variant: default/outline/ghost)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §3.2 — Component exports, design directives, CSS variables, example usage
- `UPLOADKIT-GSD.md` §3.3 — generateReactHelpers pattern (AppFileRouter type flow)

### Prior Phase Context
- `.planning/phases/04-sdk-core-next-js-adapter/04-CONTEXT.md` — D-01 (createUploadKit factory), D-07 (AppFileRouter + generateReactHelpers generic)

### Existing Code
- `packages/react/src/index.ts` — Empty stub from Phase 1
- `packages/react/tsup.config.ts` — Build config (ESM + CJS)
- `packages/react/package.json` — Package scaffold
- `packages/next/src/helpers.ts` — generateReactHelpers type stub (Phase 4)
- `packages/next/src/types.ts` — FileRouter, RouteConfig types
- `packages/core/src/index.ts` — createUploadKit, upload, listFiles, deleteFile exports

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core` — `createUploadKit` client that components will wrap
- `packages/next/src/helpers.ts` — `generateReactHelpers<TRouter>` type stub to implement
- `packages/next/src/types.ts` — `FileRouter`, `RouteConfig`, `UploadedFile` types
- `packages/ui/` — shadcn primitives (Button, Input) available but React SDK should be independent

### Established Patterns
- tsup ESM + CJS build (Phase 1)
- `sideEffects: false` (or `["*.css"]` for styles.css)
- peerDependencies for React
- `@uploadkit/core` as regular dependency

### Integration Points
- `UploadKitProvider` wraps app, passes config to `createUploadKit`
- `useUploadKit` hook calls core SDK methods
- `generateReactHelpers` returns pre-typed UploadButton/UploadDropzone/useUploadKit
- `styles.css` imported by developer in their layout/entry point

</code_context>

<specifics>
## Specific Ideas

- The `appearance` prop should use a type like `Record<string, string>` where keys are component part names — this allows Tailwind classes to be passed directly
- `styles.css` must declare all `--uk-*` variables in `:root` with light defaults and override in `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`
- `sideEffects` in package.json must include `["*.css"]` so bundlers don't tree-shake the stylesheet
- Canvas thumbnail generation should be lazy — only generate when the file preview is visible (IntersectionObserver)
- UploadModal should use `<dialog>` element for native accessibility (focus trap, ESC to close) instead of a custom div overlay

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-sdk-react-components*
*Context gathered: 2026-04-08*
