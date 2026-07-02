'use client';

import { UploadKitProvider, UploadCropper } from '@uploadkitdev/react';

export function CropperDemo() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <UploadCropper route="default" aspectRatio={1} />
    </UploadKitProvider>
  );
}
