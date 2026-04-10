# @uploadkitdev/react

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
