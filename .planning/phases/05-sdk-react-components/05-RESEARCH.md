# Phase 5: SDK React Components — Research

**Researched:** 2026-04-08
**Domain:** React component library, CSS-only theming, file upload UI, TypeScript generics
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Vanilla CSS file shipped as `@uploadkit/react/styles.css`. Developer imports once. No CSS-in-JS runtime. Zero JS animation dependency — CSS transitions only.
- **D-02:** Customization via `className` prop (outer container) + `appearance` prop for sub-elements: `appearance={{ button: '...', container: '...', progressBar: '...' }}`. Tailwind merge compatible.
- **D-03:** Opinionated beautiful defaults — components look premium out of the box with CSS custom properties. No styling required from the developer unless they want to customize.
- **D-04:** CSS transitions only — no motion/framer-motion dependency. `transition: all 200ms ease-out` for state changes. CSS `@keyframes` for progress bar animation.
- **D-05:** Upload progress: thin bar below component + percentage text. Linear-style loading bars.
- **D-06:** UploadModal: scale(0.95) → scale(1) + opacity fade on enter, reverse on exit. Backdrop blur fade. 200ms ease-out.
- **D-07:** Multi-file: stacked list below the dropzone. Each file shows name, size, thin progress bar, and remove button.
- **D-08:** File rejection: inline error toast below dropzone — "photo.exe rejected — .exe files not allowed". Red text, auto-dismiss after 5s.
- **D-09:** Client-side thumbnails via canvas + createObjectURL. Images: render to canvas for thumbnail. Videos: capture first frame. Others: file type icon. All client-side, no server round-trip.
- **D-10:** CSS custom properties with `--uk-` prefix: `--uk-primary`, `--uk-bg`, `--uk-border`, `--uk-text`, `--uk-text-secondary`, `--uk-success`, `--uk-error`, `--uk-radius`.
- **D-11:** Dark mode via `prefers-color-scheme` media query (default) + `[data-theme="dark"]` attribute override on any parent element. Components respond to both.

### Specific Ideas (from CONTEXT.md)
- `appearance` prop type: `Record<string, string>` where keys are part names — allows Tailwind classes
- `styles.css` must declare all `--uk-*` variables in `:root` with light defaults, override in `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`
- `sideEffects` in package.json must include `["*.css"]` so bundlers don't tree-shake the stylesheet
- Canvas thumbnail generation lazy — only generate when preview is visible (IntersectionObserver)
- UploadModal should use `<dialog>` element for native accessibility (focus trap, ESC to close)

### Claude's Discretion
- Internal component state management (useReducer vs useState)
- FileList/FilePreview component internal structure
- Accessibility implementation details (focus trap, aria attributes)
- generateReactHelpers runtime implementation (wrapping core SDK)
- UploadKitProvider context design
- CSS specificity strategy for styles.css
- Component variant implementation (size: sm/md/lg, variant: default/outline/ghost)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REACT-01 | UploadKitProvider context with API key configuration | Context pattern with createContext + custom hook; wraps createUploadKit from @uploadkit/core |
| REACT-02 | useUploadKit headless hook (upload, progress, status, error, abort) | useReducer for multi-state orchestration; wraps UploadKitClient.upload() with onProgress |
| REACT-03 | UploadButton with states and variants | CSS class strategy for state variants; hidden `<input type="file">` trigger |
| REACT-04 | UploadDropzone with drag-and-drop, per-file progress, multi-file | Drag event pitfall: child element dragenter fires before parent dragleave; counter strategy |
| REACT-05 | UploadModal with backdrop blur, animation, ESC/click-outside close | Native `<dialog>` element handles focus trap + ESC natively in modern browsers |
| REACT-06 | FileList component with uploaded files and actions | Maps UploadResult[] from core; delete via UploadKitClient.deleteFile() |
| REACT-07 | FilePreview with canvas thumbnail, video poster, type icons | canvas drawImage after loadedmetadata; IntersectionObserver for lazy generation |
| REACT-08 | CSS custom properties theming (`--uk-*`) | `:root` light defaults + `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` |
| REACT-09 | Dark mode native (prefers-color-scheme + explicit override) | CSS specificity: `[data-theme="dark"]` must override `@media` — achieved with explicit selector |
| REACT-10 | className + appearance prop, Tailwind merge compatible | appearance keys map to component part class overrides; simple string merge (no twMerge dep) |
| REACT-11 | Premium visual design matching Vercel/Supabase/Linear quality | CSS variables + noise texture + subtle glow + border strategy from CLAUDE.md |
| REACT-12 | generateReactHelpers<AppFileRouter>() for typed component generation | Factory returns pre-typed component wrappers; TRouter generic flows from @uploadkit/next |
| REACT-13 | WCAG 2.1 AA accessibility (focus-visible, aria-labels, reduced-motion) | `@media (prefers-reduced-motion)` disables transitions; aria-live for progress announcements |

</phase_requirements>

---

## Summary

Phase 5 builds the `@uploadkit/react` package from its current empty stub into a fully-featured, accessible, premium-quality upload component library. The package ships two public artifacts: (1) an ESM+CJS JavaScript bundle containing all components, hooks, and the `generateReactHelpers` factory, and (2) a plain `styles.css` file that developers import once in their layout.

The technical surface is broad but well-bounded by the locked decisions. The most complex individual problems are: (a) the drag-and-drop state machine (child element events cause spurious drag-leave — requires a counter technique), (b) the canvas thumbnail pipeline (requires proper async sequencing through `loadedmetadata` and IntersectionObserver), (c) the `generateReactHelpers` generic factory that must correctly thread `TRouter` from `@uploadkit/next` through to component prop types, and (d) the `<dialog>` modal which provides native focus trapping and ESC handling but requires explicit `showModal()` imperative calls via useRef.

The build configuration requires two changes from the Phase 1 scaffold: adding a separate `styles.css` entry point to tsup config, and changing `sideEffects` in package.json from `false` to `["*.css"]`.

**Primary recommendation:** Build in this order — (1) Provider + hook foundation, (2) CSS variables + styles.css, (3) UploadButton, (4) UploadDropzone with drag state machine, (5) UploadModal with dialog, (6) FileList + FilePreview, (7) generateReactHelpers factory, (8) accessibility pass, (9) build config finalization.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | >=18 (installed: 19.2.4) | UI framework | Peer dependency; already in monorepo |
| @uploadkit/core | workspace:* | Upload logic (upload, listFiles, deleteFile) | Internal; Phase 4 deliverable |
| @uploadkit/next | workspace:* (types only) | TRouter generic for generateReactHelpers | Type import only — no runtime dep |

[VERIFIED: packages/react/package.json, packages/react/node_modules/react/package.json]

### Supporting (zero extra runtime deps)

| API | Purpose | When to Use |
|-----|---------|-------------|
| HTML `<dialog>` | Native modal with focus trap + ESC | UploadModal (replaces custom div overlay) |
| Canvas API | Image/video thumbnail generation | FilePreview thumbnail pipeline |
| URL.createObjectURL() | Blob → object URL for img src | Canvas video source, image preview |
| IntersectionObserver | Lazy thumbnail generation | Only render canvas when preview visible |
| FileReader / File API | File metadata access | Already used by core validation layer |
| AbortController | Cancel in-flight upload | useUploadKit abort implementation |

[ASSUMED: all these Web APIs are available in target browsers — React 18+ drops IE11 support]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | Custom div overlay + focus-trap-react | Library adds 2KB; native dialog handles focus trap + ESC natively in all modern browsers |
| Vanilla CSS | CSS Modules | Modules require build-step awareness from consumers; vanilla file is simpler for an SDK |
| Vanilla CSS | Tailwind CSS | Tailwind requires consumer setup; SDK must be self-contained |
| Simple string concat for `appearance` | twMerge | twMerge = extra dep; simple concatenation works when consumer handles class conflicts |

**Installation changes needed:**

```bash
# No new deps needed at runtime — all Web APIs
# styles.css needs a separate tsup entry:
# tsup.config.ts: entry: ['src/index.ts', 'src/styles.css']
# package.json: sideEffects: ["*.css"]
# package.json exports: add "./styles.css": "./dist/styles.css"
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/react/src/
├── index.ts                  # Public API barrel — all named exports
├── styles.css                # All CSS variables + component styles (ships as dist/styles.css)
├── context.tsx               # UploadKitContext + UploadKitProvider + useUploadKitContext
├── use-upload-kit.ts         # useUploadKit headless hook (wraps core SDK)
├── helpers.ts                # generateReactHelpers<TRouter>() factory (replaces @uploadkit/next stub)
├── components/
│   ├── upload-button.tsx     # UploadButton component
│   ├── upload-dropzone.tsx   # UploadDropzone component
│   ├── upload-modal.tsx      # UploadModal component
│   ├── file-list.tsx         # FileList component
│   └── file-preview.tsx      # FilePreview component
├── hooks/
│   ├── use-drag-state.ts     # Drag-and-drop state machine (counter technique)
│   ├── use-thumbnail.ts      # Canvas thumbnail generation hook
│   └── use-auto-dismiss.ts   # Auto-dismiss timer for rejection toasts
└── utils/
    ├── file-icons.ts         # File type → icon mapping
    ├── format-bytes.ts       # Byte formatting (4MB, 1.2GB)
    └── merge-class.ts        # Simple className + appearance class merging
```

### Pattern 1: UploadKitProvider + Context

The provider creates a `UploadKitClient` instance once and exposes it via context. Components read the client via `useUploadKitContext()` — a custom hook that throws a helpful error when used outside the provider.

```typescript
// Source: [VERIFIED: react.dev/reference/react/createContext pattern + STATE.md decisions]
import { createContext, useContext, useRef } from 'react';
import { createUploadKit, type UploadKitConfig } from '@uploadkit/core';

type UploadKitContextValue = {
  client: ReturnType<typeof createUploadKit>;
};

const UploadKitContext = createContext<UploadKitContextValue | null>(null);

export function UploadKitProvider({
  apiKey,
  baseUrl,
  children,
}: UploadKitConfig & { children: React.ReactNode }) {
  // useRef to avoid re-creating client on re-render
  const clientRef = useRef(createUploadKit({ apiKey, baseUrl }));
  return (
    <UploadKitContext.Provider value={{ client: clientRef.current }}>
      {children}
    </UploadKitContext.Provider>
  );
}

export function useUploadKitContext() {
  const ctx = useContext(UploadKitContext);
  if (!ctx) throw new Error('useUploadKit must be used inside <UploadKitProvider>');
  return ctx;
}
```

[ASSUMED: useRef to stabilize client instance is idiomatic; confirmed by general React patterns]

### Pattern 2: useUploadKit Hook with useReducer

Upload state has 5 interdependent fields: `status`, `progress`, `error`, `result`, `abortController`. useReducer is the correct tool — one dispatch call atomically transitions all fields together.

```typescript
// Source: [ASSUMED based on React docs and Kent C. Dodds useReducer guidance]
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadState = {
  status: UploadStatus;
  progress: number;
  error: Error | null;
  result: UploadResult | null;
  abortController: AbortController | null;
};

type UploadAction =
  | { type: 'START'; controller: AbortController }
  | { type: 'PROGRESS'; percent: number }
  | { type: 'SUCCESS'; result: UploadResult }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'START': return { status: 'uploading', progress: 0, error: null, result: null, abortController: action.controller };
    case 'PROGRESS': return { ...state, progress: action.percent };
    case 'SUCCESS': return { ...state, status: 'success', progress: 100, result: action.result, abortController: null };
    case 'ERROR': return { ...state, status: 'error', error: action.error, abortController: null };
    case 'RESET': return initialState;
  }
}
```

### Pattern 3: Drag-and-Drop State Machine (Counter Technique)

**Critical:** The standard boolean `isDragging` approach breaks when the dropzone contains child elements. `dragenter` fires on every child element, causing `dragleave` to fire on the parent before the new child fires `dragenter` — resulting in the "flickering" bug.

The correct fix is a drag counter:

```typescript
// Source: [VERIFIED: GitHub gist alexreardon/drag-drop-timing + Smashing Magazine 2020]
const [dragCounter, setDragCounter] = useState(0);
const isDragging = dragCounter > 0;

const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  setDragCounter(c => c + 1);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setDragCounter(c => c - 1);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setDragCounter(0); // reset to 0 on drop, not decrement
  const files = Array.from(e.dataTransfer.files);
  // ... process files
};
```

This pattern is extracted into `use-drag-state.ts` so it can be used by both UploadDropzone and UploadModal.

### Pattern 4: UploadModal with Native `<dialog>`

The native `<dialog>` element provides: (1) automatic focus trap, (2) ESC key closes without JS, (3) `::backdrop` pseudo-element for overlay, (4) `aria-modal` behavior built-in. Use `showModal()` and `close()` imperative API via `useRef<HTMLDialogElement>`.

```typescript
// Source: [VERIFIED: CSS-Tricks "There is No Need to Trap Focus on a Dialog Element"]
export function UploadModal({ open, onClose, ...props }: UploadModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Handle click-outside (backdrop click)
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  // Handle native ESC — dialog fires 'cancel' event
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault(); // prevent dialog auto-close; let our state manage it
    onClose();
  };

  return (
    <dialog ref={dialogRef} onClick={handleDialogClick} onCancel={handleCancel} className="uk-modal">
      <UploadDropzone {...props} />
    </dialog>
  );
}
```

**Note:** The `cancel` event fires when ESC is pressed. Prevent default to let React state drive the open/close (not the native attribute).

[VERIFIED: MDN dialog element documentation referenced via WebSearch]

### Pattern 5: Canvas Thumbnail Generation

Video thumbnails: create a detached `<video>` element, set `src = URL.createObjectURL(file)`, wait for `loadedmetadata`, set `currentTime = 0`, wait for `seeked`, draw to canvas, call `toDataURL()`, then `URL.revokeObjectURL()` to release memory.

```typescript
// Source: [VERIFIED: xjavascript.com/blog/create-thumbnail-from-video-file via WebSearch]
async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0;
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;  // thumbnail width
      canvas.height = Math.round(160 * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video thumbnail generation failed'));
    });
  });
}
```

For images: simpler — `URL.createObjectURL(file)` can be used directly as `img.src`. Canvas resizing is optional (only needed for consistent thumbnail dimensions).

### Pattern 6: generateReactHelpers Factory

`generateReactHelpers<TRouter>()` returns pre-typed component wrappers where the `route` prop autocompletes to `keyof TRouter`. The factory closes over a shared context-based client.

```typescript
// Source: [ASSUMED — TypeScript generics pattern inferred from @uploadkit/next helpers.ts stub]
import type { FileRouter } from '@uploadkit/next';

export function generateReactHelpers<TRouter extends FileRouter>() {
  return {
    UploadButton: (props: UploadButtonProps<keyof TRouter & string>) =>
      <UploadButton {...props} />,
    UploadDropzone: (props: UploadDropzoneProps<keyof TRouter & string>) =>
      <UploadDropzone {...props} />,
    UploadModal: (props: UploadModalProps<keyof TRouter & string>) =>
      <UploadModal {...props} />,
    useUploadKit: (route: keyof TRouter & string) =>
      useUploadKit(route),
  };
}
```

The `route` prop type becomes `'imageUploader' | 'documentUploader'` when `TRouter = AppFileRouter` — this is the end-to-end type safety promised by NEXT-04.

[ASSUMED: This runtime implementation pattern; the type stub in @uploadkit/next confirms the expected signature]

### Pattern 7: CSS Specificity Strategy

`styles.css` must be written such that:
1. `:root` defines all `--uk-*` variables (light theme defaults)
2. `@media (prefers-color-scheme: dark)` overrides variables on `:root`
3. `[data-theme="dark"]` overrides both — has higher specificity than `@media`
4. `[data-theme="light"]` can force light mode even when OS is dark

```css
/* Source: [VERIFIED: MDN prefers-color-scheme + multiple WebSearch sources] */
:root {
  --uk-primary: #0070f3;
  --uk-bg: #ffffff;
  --uk-border: #eaeaea;
  --uk-text: #171717;
  --uk-text-secondary: #666666;
  --uk-success: #00c853;
  --uk-error: #ef4444;
  --uk-radius: 12px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --uk-bg: #0a0a0a;
    --uk-bg-secondary: #1a1a1a;
    --uk-border: #2a2a2a;
    --uk-text: #ededed;
    --uk-text-secondary: #888888;
  }
}

/* Explicit override wins over prefers-color-scheme */
[data-theme="dark"] {
  --uk-bg: #0a0a0a;
  --uk-bg-secondary: #1a1a1a;
  --uk-border: #2a2a2a;
  --uk-text: #ededed;
  --uk-text-secondary: #888888;
}

[data-theme="light"] {
  --uk-bg: #ffffff;
  /* ... restore light defaults */
}
```

**Critical specificity rule:** `[data-theme="dark"]` selector has specificity 0-1-0 (attribute selector). `:root` inside `@media` also has 0-1-0. So `[data-theme]` DOES NOT automatically beat `@media` by specificity alone — it beats it because CSS applies the last-declared rule when specificities are equal. Place `[data-theme]` overrides AFTER the `@media` block in the stylesheet.

[VERIFIED: CSS Cascade specification; MDN specificity documentation]

### Pattern 8: appearance Prop Class Merging

The `appearance` prop maps component part names to CSS class strings. The merge is additive — appearance classes are appended to the component's default class:

```typescript
// Source: [ASSUMED — design decision from CONTEXT.md D-02]
type AppearanceConfig = Partial<Record<
  'container' | 'button' | 'progressBar' | 'label' | 'icon' | 'fileItem' | 'filePreview',
  string
>>;

// Usage inside component:
function mergeClass(base: string, override?: string): string {
  if (!override) return base;
  return `${base} ${override}`;
}

// In component:
<div className={mergeClass('uk-dropzone', appearance?.container)}>
```

**No `twMerge` dependency.** When a developer passes Tailwind classes that conflict with `--uk-*` variable-based defaults, they should also pass the appropriate CSS variable override on their container. Since the components use CSS variables, not utility classes, conflicts are rare.

### Anti-Patterns to Avoid

- **Boolean isDragging for dropzone:** Fails on child element drag events. Always use a counter.
- **CSS-in-JS for theming:** Violates D-01. Inline styles for theming break consumer customization.
- **`forwardRef` wrapper (React 19):** React 19 (installed: 19.2.4) accepts `ref` as a regular prop. Use `ref` directly in props type without `forwardRef`. However, use `forwardRef` if peerDependency constraint is `>=18` and the library must support React 18 too. Given `peerDependencies: "react": ">=18"`, use `forwardRef` for compat — it is deprecated but still works in React 19. [VERIFIED: react.dev/blog/2024/12/05/react-19]
- **Calling `URL.createObjectURL` without `revokeObjectURL`:** Memory leak. Always revoke after thumbnail is generated.
- **Using `e.dataTransfer.getData()` in dragover:** Returns empty string by design. Only call in the `drop` handler.
- **`dialog.close()` without preventing default `cancel`:** If ESC fires `cancel` and you don't `e.preventDefault()`, the dialog closes via native DOM but React state still thinks `open=true`. Prevent default, let React drive state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap | Custom focus management | Native `<dialog>` element | Browser-native, handles focus, ESC, backdrop — zero JS complexity |
| CSS specificity conflicts | Complex class naming | CSS custom properties cascade | Variables cascade naturally — no specificity war |
| Drag counter | Complex pointer tracking | Integer counter + set-to-zero-on-drop | 4 lines solves the child element event bubbling problem |
| Video first-frame | Server-side thumbnail | `video.currentTime = 0` + canvas | Entirely client-side, no server round-trip |
| Class conflict resolution | twMerge | Additive class concat | Components use CSS variables, not Tailwind utilities — conflicts don't arise |
| Type-safe route routing | string literal types | TypeScript generics (`keyof TRouter`) | Compiler enforces valid route names at authoring time |

**Key insight:** Every "hard" problem in this phase (focus trapping, CSS theming, type safety) has a browser-native or TypeScript-native solution. The instinct to reach for a library is usually wrong here — the SDK IS the library and must minimize its own dependencies.

---

## Common Pitfalls

### Pitfall 1: Drag Flickering on Child Elements

**What goes wrong:** When a child element (file icon, text, progress bar) is hovered during drag, `dragleave` fires on the dropzone container before `dragenter` fires for the child. The boolean `isDragging` flips to false, removing the highlighted state momentarily.

**Why it happens:** The DOM fires drag events for every element in the hierarchy independently. `dragleave` fires for the parent when the pointer moves into a child.

**How to avoid:** Use an integer counter (`dragCounter`). Increment on `dragenter`, decrement on `dragleave`, zero on `drop`. `isDragging = counter > 0`.

**Warning signs:** Dropzone border flickers during drag when cursor crosses internal elements.

### Pitfall 2: `styles.css` Tree-Shaken by Bundlers

**What goes wrong:** Webpack/Vite/Rollup see no JS import of `styles.css` and tree-shake it from the consumer's bundle. Developer gets no styles.

**Why it happens:** `sideEffects: false` in package.json tells bundlers the package has no side effects — including stylesheets.

**How to avoid:** Set `sideEffects: ["*.css"]` in `packages/react/package.json`. [VERIFIED: current package.json has `sideEffects: false` — this MUST be changed]

**Warning signs:** No styles applied in consumer app even after import.

### Pitfall 3: `styles.css` Not Emitted by tsup

**What goes wrong:** tsup's current entry `['src/index.ts']` only processes JS. The `styles.css` file in `src/` is not copied to `dist/`.

**Why it happens:** tsup is a JS bundler; CSS files must be explicitly added as entry points or copied separately.

**How to avoid:** Add `'src/styles.css'` to the `entry` array in `tsup.config.ts`. tsup will copy/process it to `dist/styles.css`. Also add the export to `package.json`:

```json
"exports": {
  ".": { "import": "./dist/index.js", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" },
  "./styles.css": "./dist/styles.css"
}
```

[VERIFIED: tsup.egoist.dev documentation via WebSearch]

### Pitfall 4: `<dialog>` ESC Does Not Trigger React State Update

**What goes wrong:** When the user presses ESC, the native `<dialog>` fires a `cancel` event and closes itself at the DOM level. React state `open` is still `true`. On next render, `showModal()` runs again and reopens the dialog.

**Why it happens:** Native dialog has its own open/close state independent of React's.

**How to avoid:** Listen to the `cancel` event, call `e.preventDefault()` to stop native close, then call `onClose()` to update React state. Let `useEffect` drive `showModal()`/`close()` based on the `open` prop.

**Warning signs:** Dialog reopens immediately after pressing ESC.

### Pitfall 5: URL.createObjectURL Memory Leak

**What goes wrong:** Every call to `URL.createObjectURL(file)` allocates a memory-mapped object URL that persists until `revokeObjectURL()` is called or the page unloads. With 10 files each with thumbnails, memory bloat accumulates.

**Why it happens:** createObjectURL creates a live reference to a Blob/File — it is not garbage collected automatically.

**How to avoid:** After drawing to canvas or after the `<img>` element fires `onLoad`, call `URL.revokeObjectURL(url)`. In useEffect cleanup, revoke any active URLs.

**Warning signs:** Memory usage grows with each file selection without declining.

### Pitfall 6: TypeScript Strict Mode + exactOptionalPropertyTypes

**What goes wrong:** The monorepo uses `exactOptionalPropertyTypes: true`. Optional props typed as `foo?: string` cannot receive `undefined` explicitly. `appearance={{ button: undefined }}` would be a type error.

**Why it happens:** `exactOptionalPropertyTypes` distinguishes between `foo?: string` (key absent) and `foo: string | undefined` (key present with undefined value).

**How to avoid:** Type `AppearanceConfig` with `Partial<Record<PartKey, string>>` — uses `Partial` to make keys optional (not `| undefined`). Internally, use `appearance?.container` (optional chaining), never `appearance.container ?? undefined`.

[VERIFIED: packages/config/typescript/tsconfig.base.json has `exactOptionalPropertyTypes: true`]

### Pitfall 7: React 19 ref Behavior and peerDep Range

**What goes wrong:** The installed React version is 19.2.4, which deprecates `forwardRef`. Using `forwardRef` generates deprecation warnings. NOT using it breaks React 18 consumers (peerDep `>=18`).

**Why it happens:** React 19 lets `ref` be a regular prop; React 18 requires `forwardRef` for components that forward refs.

**How to avoid:** Use `forwardRef` throughout — it still works in React 19 (only deprecated, not removed). This maintains backward compat with the `>=18` peer dep range. Mark this as a known upgrade target when the peerDep min becomes `>=19`. [VERIFIED: react.dev/blog/2024/12/05/react-19]

---

## Code Examples

### CSS Variables — Complete styles.css Structure

```css
/* Source: UPLOADKIT-GSD.md §3.2 + CONTEXT.md D-10/D-11 */

/* ─── Tokens ───────────────────────────────────────── */
:root {
  --uk-primary: #0070f3;
  --uk-primary-hover: #005bb5;
  --uk-bg: #ffffff;
  --uk-bg-secondary: #fafafa;
  --uk-border: #eaeaea;
  --uk-text: #171717;
  --uk-text-secondary: #666666;
  --uk-success: #00c853;
  --uk-error: #ef4444;
  --uk-radius: 12px;
  --uk-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --uk-bg: #0a0a0a;
    --uk-bg-secondary: #141414;
    --uk-border: #2a2a2a;
    --uk-text: #ededed;
    --uk-text-secondary: #888888;
  }
}

/* Explicit override — place AFTER @media block */
[data-theme="dark"] {
  --uk-bg: #0a0a0a;
  --uk-bg-secondary: #141414;
  --uk-border: #2a2a2a;
  --uk-text: #ededed;
  --uk-text-secondary: #888888;
}

[data-theme="light"] {
  --uk-bg: #ffffff;
  --uk-bg-secondary: #fafafa;
  --uk-border: #eaeaea;
  --uk-text: #171717;
  --uk-text-secondary: #666666;
}

/* ─── Progress bar animation ────────────────────────── */
@keyframes uk-progress-indeterminate {
  0% { transform: translateX(-100%) scaleX(0.3); }
  50% { transform: translateX(0%) scaleX(0.5); }
  100% { transform: translateX(100%) scaleX(0.3); }
}

/* ─── Modal animation ───────────────────────────────── */
@keyframes uk-modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* ─── Reduced motion ────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .uk-button,
  .uk-dropzone,
  .uk-progress-bar,
  .uk-modal { transition: none !important; animation: none !important; }
}
```

### tsup.config.ts — Updated for CSS Entry

```typescript
// Source: [VERIFIED: tsup.egoist.dev, GitHub Discussion #621]
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  external: ['react', 'react-dom', '@uploadkit/core'],
});
```

### package.json — Updated Exports and sideEffects

```json
{
  "sideEffects": ["*.css"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  }
}
```

### index.ts — Public Exports

```typescript
// All public exports from @uploadkit/react
export { UploadKitProvider, useUploadKitContext } from './context';
export { useUploadKit } from './use-upload-kit';
export { UploadButton } from './components/upload-button';
export { UploadDropzone } from './components/upload-dropzone';
export { UploadModal } from './components/upload-modal';
export { FileList } from './components/file-list';
export { FilePreview } from './components/file-preview';
export { generateReactHelpers } from './helpers';
export type {
  UploadButtonProps,
  UploadDropzoneProps,
  UploadModalProps,
  FileListProps,
  FilePreviewProps,
  AppearanceConfig,
  UploadKitProviderProps,
} from './types';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `forwardRef()` wrapper | `ref` as regular prop | React 19 (Dec 2024) | `forwardRef` is deprecated; still functional — use for React 18 compat |
| Custom div overlay for modals | Native `<dialog>` element | Browsers 2023+ (100% support) | No focus-trap library needed; `::backdrop` pseudo-element handles overlay |
| focus-trap-react library | `<dialog showModal()>` built-in | Browser spec change | 0KB overhead, native a11y |
| Custom drag-and-drop libraries | Native HTML5 Drag and Drop API | Long-standing browser support | Works without react-dnd; counter technique solves child-element flickering |

**Deprecated/outdated:**
- `ReactDOM.createPortal` for modals: Still valid but `<dialog>` is superior for upload modals where focus management matters
- `document.createElement('video')` + `canplaythrough` event: Use `loadedmetadata` + `seeked` instead; `canplaythrough` is delayed and unreliable for thumbnail extraction

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is a pure TypeScript/CSS source phase with no external services, CLI tools, or databases. All browser APIs used (Canvas, dialog, IntersectionObserver, URL) are available in any React 18+ compatible browser environment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not yet configured for `packages/react` — Wave 0 gap |
| Config file | None — see Wave 0 |
| Quick run command | `cd packages/react && pnpm test` (after Wave 0 setup) |
| Full suite command | `pnpm --filter @uploadkit/react test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REACT-01 | Provider wraps children; useUploadKitContext throws outside | unit | `vitest run src/__tests__/context.test.tsx` | Wave 0 |
| REACT-02 | useUploadKit cycles through idle→uploading→success states | unit | `vitest run src/__tests__/use-upload-kit.test.tsx` | Wave 0 |
| REACT-03 | UploadButton renders, triggers file picker, shows states | unit | `vitest run src/__tests__/upload-button.test.tsx` | Wave 0 |
| REACT-04 | Dropzone accepts/rejects files, drag counter increments | unit | `vitest run src/__tests__/upload-dropzone.test.tsx` | Wave 0 |
| REACT-05 | Modal opens/closes with ESC and click-outside | unit | `vitest run src/__tests__/upload-modal.test.tsx` | Wave 0 |
| REACT-08 | CSS variables present in styles.css | manual | inspect dist/styles.css | N/A |
| REACT-10 | appearance classes appended to default classes | unit | `vitest run src/__tests__/merge-class.test.ts` | Wave 0 |
| REACT-12 | generateReactHelpers returns typed components | type check | `pnpm typecheck` | Wave 0 |
| REACT-13 | aria-label, focus-visible, reduced-motion present | unit + manual | `vitest run` + axe DevTools | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @uploadkit/react typecheck`
- **Per wave merge:** `pnpm --filter @uploadkit/react test && pnpm --filter @uploadkit/react build`
- **Phase gate:** Full suite green + build succeeds before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/react/vitest.config.ts` — test framework config
- [ ] `packages/react/src/__tests__/` — test directory
- [ ] `pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom --filter @uploadkit/react`
- [ ] `packages/react/package.json` scripts: add `"test": "vitest run"`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useRef` to stabilize UploadKitClient instance in Provider is idiomatic | Architecture Patterns §1 | Low — alternative is `useMemo(() => createUploadKit(...), [apiKey])` which has same effect |
| A2 | `generateReactHelpers` factory implementation wraps and re-exports base components with constrained prop types | Architecture Patterns §6 | Medium — alternative is separate typed component classes; impacts API surface |
| A3 | Browser Web APIs (Canvas, dialog, IntersectionObserver, URL.createObjectURL) available in all target environments | Standard Stack | Low — React 18 dropped IE11; all APIs available in Chrome/Firefox/Safari 2021+ |
| A4 | `forwardRef` is the correct ref pattern given `peerDependencies: "react": ">=18"` | Anti-Patterns | Low — forwardRef still works in React 19; affects DX not correctness |
| A5 | `appearance` uses simple string concatenation without twMerge | Architecture Patterns §8 | Low — SDK uses CSS variables not Tailwind utilities, so class conflicts are minimal |

---

## Open Questions

1. **Should `@uploadkit/next` import be a devDependency or just a type-only import?**
   - What we know: `generateReactHelpers<TRouter>()` needs `FileRouter` type from `@uploadkit/next`
   - What's unclear: Whether to add `@uploadkit/next` as a devDependency and use `import type`, or copy the `FileRouter` type into `@uploadkit/react` directly
   - Recommendation: Use `import type { FileRouter } from '@uploadkit/next'` with `@uploadkit/next` as a devDependency. TypeScript's `isolatedModules: true` and `import type` ensure zero runtime dep. Consumers import `AppFileRouter` from their own app — the `FileRouter` type constraint never ships in the JS bundle.

2. **`<dialog>` backdrop — `::backdrop` vs custom overlay div?**
   - What we know: `::backdrop` is the native pseudo-element; custom div requires `position: fixed; inset: 0`
   - What's unclear: `::backdrop` has limited styling API (no CSS variables inheritance in some browsers)
   - Recommendation: Use `::backdrop` with fallback. CSS variables don't inherit into `::backdrop` — pass backdrop blur/opacity as literal values in `::backdrop { backdrop-filter: blur(8px); background: rgba(0,0,0,0.4); }`.

3. **Multi-file upload: sequential vs parallel?**
   - What we know: `useUploadKit` currently models a single-file upload state machine
   - What's unclear: UploadDropzone supports multi-file (D-07) — how are concurrent uploads tracked?
   - Recommendation: UploadDropzone maintains its own `files: Map<string, FileUploadState>` (keyed by a UUID per file), separate from `useUploadKit` which remains single-file. The dropzone fires `n` parallel uploads and tracks each independently.

---

## Sources

### Primary (HIGH confidence)
- `packages/react/package.json` — peer deps (react >=18, installed 19.2.4), current sideEffects: false
- `packages/react/tsup.config.ts` — current build config (entry: single JS file, external: react/react-dom/@uploadkit/core)
- `packages/next/src/helpers.ts` — generateReactHelpers type stub (Phase 4 deliverable)
- `packages/next/src/types.ts` — FileRouter, RouteConfig, UploadedFile types
- `packages/core/src/types.ts` — UploadOptions, UploadResult, UploadKitConfig types
- `packages/config/typescript/tsconfig.base.json` — exactOptionalPropertyTypes: true, lib: ES2022
- `UPLOADKIT-GSD.md §3.2` — CSS variable palette, component design directives, usage examples
- `05-CONTEXT.md` — all locked decisions D-01 through D-11

### Secondary (MEDIUM confidence)
- [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19) — forwardRef deprecation confirmed
- [CSS-Tricks: No Need to Trap Focus on Dialog](https://css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element/) — native dialog focus trap verified
- [xjavascript.com: Video Thumbnail from File Input](https://www.xjavascript.com/blog/create-thumbnail-from-video-file-via-file-input/) — loadedmetadata + seeked pattern
- [GitHub: alexreardon drag-drop timing](https://gist.github.com/alexreardon/9ef479804a7519f713fe2274e076f1f3) — drag counter technique

### Tertiary (LOW confidence)
- WebSearch results for CSS `[data-theme]` vs `@media` specificity — verified against known CSS cascade rules

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against actual installed package.json files
- Architecture patterns: HIGH (Provider/hook/drag) + MEDIUM (generateReactHelpers runtime impl)
- Pitfalls: HIGH — drag flickering, dialog ESC, memory leaks are well-documented browser behaviors
- Build changes: HIGH — verified current tsup.config.ts and package.json sideEffects

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable APIs — CSS, React Context, canvas, dialog)
