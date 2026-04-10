'use client';

// Client-boundary re-export of @uploadkitdev/react components used in MDX
// previews. Fumadocs MDX pages render as React Server Components by default,
// and importing hooks-backed SDK components directly into an MDX file pulls
// them into the server graph — which fails because every component uses
// createContext/useState/useEffect.
//
// By re-exporting everything from a file marked `'use client'`, the boundary
// is moved here: MDX pages import from this module, the bundler sees the
// `use client` directive, and the SDK components are correctly compiled into
// the client bundle.

export {
  UploadButton,
  UploadDropzone,
  UploadModal,
  UploadDropzoneGlass,
  UploadDropzoneAurora,
  UploadDropzoneTerminal,
  UploadDropzoneBrutal,
  UploadButtonShimmer,
  UploadButtonMagnetic,
  UploadAvatar,
  UploadInlineChat,
  UploadProgressRadial,
  UploadProgressBar,
  UploadProgressStacked,
  UploadProgressOrbit,
  UploadCloudRain,
  UploadBento,
  UploadParticles,
  UploadStepWizard,
} from '@uploadkitdev/react';
