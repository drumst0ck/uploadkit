# @uploadkitdev/react

## 0.5.0

### Minor Changes

- 06c5059: Enforce a route's `maxFileCount` as a per-selection client-side limit. The React components and `useUploadKit().checkSelection(files)` reject a selection with more files than the limit, upload none of them, and report `TOO_MANY_FILES` through `onUploadError` or the hook's `error`. `ProxyUploadKitClient.getRouteConfig(route)` reads the handler's route config. Routes without `maxFileCount` keep working without a limit. It is a UX guard, not a server-side quota.

### Patch Changes

- 4fb8fca: Harden the SDK handler and clients (security audit):
  - **BYOS completion now requires proof of initiation (breaking for BYOS).** The upload request returns a signed, expiring `uploadToken`; completion verifies it, checks the stored object matches the granted size and type, and passes server-built file metadata (with a signed GET URL) to `onUploadComplete`. Client-supplied `file` metadata is no longer accepted. Upgrade `@uploadkitdev/next`, `@uploadkitdev/core` and `@uploadkitdev/react` together; mismatched versions fail with `INVALID_UPLOAD_GRANT` or `UPLOAD_GRANT_REQUIRED`.
  - BYOS presigned PUT URLs sign `Content-Type` and `Content-Length`. Upload requests without a valid `contentLength` and `contentType` fail with `400 INVALID_UPLOAD`.
  - Handler errors return a generic `Internal server error` instead of internal messages. Route lookup ignores prototype keys such as `__proto__`.
  - Managed mode runs route middleware before confirming completion.
  - Express adapter requires a parsed JSON body and drops stale framing headers; Hono adapter resolves wildcard routes mounted under a prefix.
  - `generateReactHelpers` from `@uploadkitdev/next` forwards to the real `@uploadkitdev/react` implementation; the browser entry no longer pulls storage code.
  - Core: base URLs must be `https` (or `http` on localhost); multipart parts retry, abort together, and never abort after completion was dispatched; abort listeners are removed after each XHR.
  - React: unmounting or starting a new upload aborts the previous one without stale progress; `reset()` now also cancels an in-flight upload; video thumbnails revoke object URLs safely.

- Updated dependencies [06c5059]
- Updated dependencies [4fb8fca]
- Updated dependencies [51dd556]
  - @uploadkitdev/core@0.3.0

## 0.4.0

### Minor Changes

- a35f509: New `UploadBeam` wrapper component with Apple Intelligence-style animated border beam effect during uploads. CSS `@property` + conic-gradient + mask-composite technique — zero external dependencies.
  - `<UploadBeam state="uploading">` wraps any element with a spinning indigo beam
  - `beam` prop added to `UploadDropzone`, `UploadButton`, and all button variants (Gradient, Magnetic, Pulse, Shimmer)
  - New `<UploadButtonBeam>` standalone variant — beam-first design
  - States: idle, uploading (indigo spin), complete (green flash), error (red flash)
  - Dark mode, reduced-motion fallback, CSS custom properties theming

## 0.3.0

### Minor Changes

- 4ab4217: Add 16 new opinionated upload components and a `client` prop on `UploadKitProvider` for client injection (tests, docs previews).

  **Premium variants (8)** — distinct aesthetic directions with optional Motion animations:
  - `UploadDropzoneGlass` — Vercel/Linear frosted glass with indigo glow halo
  - `UploadDropzoneAurora` — Apple/Supabase animated conic mesh + cursor highlight
  - `UploadDropzoneTerminal` — Raycast/Warp mono prompt with tail log
  - `UploadDropzoneBrutal` — neobrutalist thick borders with stamp animation
  - `UploadButtonShimmer` — animated shimmer sweep gradient
  - `UploadButtonMagnetic` — Apple-style cursor-attracted spring
  - `UploadAvatar` — circular crop with SVG progress ring
  - `UploadInlineChat` — ChatGPT/Linear composer with animated chips

  **Motion & Progress variants (8)** — focused on upload progress visualization:
  - `UploadProgressRadial` — large SVG progress ring with splash on complete
  - `UploadProgressBar` — sleek horizontal bar with shimmer sweep
  - `UploadProgressStacked` — iOS AirDrop-style vertical stack
  - `UploadProgressOrbit` — file icons orbit center, land on complete
  - `UploadCloudRain` — files rain into a cloud SVG, fill = progress
  - `UploadBento` — bento grid with layoutId reorder
  - `UploadParticles` — particles converge to center by progress
  - `UploadStepWizard` — multi-step select→preview→confirm→upload→done

  **`motion` is an optional peerDependency** — all components render static CSS fallbacks when motion is not installed. `prefers-reduced-motion` respected throughout.

  **`UploadKitProvider` now accepts `client?`** — lets you inject a custom `ProxyUploadKitClient` instance (useful for tests and docs previews that use a mock client). `endpoint` remains the standard prop for production apps.

## 0.2.1

### Patch Changes

- Add MIT license (see `LICENSE`), author, homepage, repository and bugs
  metadata to `package.json`. The npm landing page now shows proper license,
  repo link and keywords.
- Updated dependencies
  - @uploadkitdev/core@0.2.1

## 0.2.0

### Minor Changes

- 166ae4f: Initial beta release of UploadKit SDK packages.
  - @uploadkitdev/core: TypeScript upload client with presigned URLs, multipart, retry, abort, BYOS
  - @uploadkitdev/react: Premium React components (UploadButton, UploadDropzone, UploadModal, FileList, FilePreview) with CSS theming
  - @uploadkitdev/next: Next.js App Router adapter with typed file routes and middleware

### Patch Changes

- Updated dependencies [166ae4f]
  - @uploadkitdev/core@0.2.0
