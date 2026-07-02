'use client';

import { UploadKitProvider, UploadDropzone } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

/** Minimal Svelte-style upload dropzone placeholder — full Svelte components ship in a future release. */
export function SvelteUploadDropzoneStub() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <UploadDropzone route="default" />
    </UploadKitProvider>
  );
}
