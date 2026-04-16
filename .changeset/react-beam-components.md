---
'@uploadkitdev/react': minor
---

New `UploadBeam` wrapper component with Apple Intelligence-style animated border beam effect during uploads. CSS `@property` + conic-gradient + mask-composite technique — zero external dependencies.

- `<UploadBeam state="uploading">` wraps any element with a spinning indigo beam
- `beam` prop added to `UploadDropzone`, `UploadButton`, and all button variants (Gradient, Magnetic, Pulse, Shimmer)
- New `<UploadButtonBeam>` standalone variant — beam-first design
- States: idle, uploading (indigo spin), complete (green flash), error (red flash)
- Dark mode, reduced-motion fallback, CSS custom properties theming
