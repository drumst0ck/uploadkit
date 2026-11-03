'use client';

// The root browser condition is covered by published.test.mjs. These relative
// built entries also exercise the actual RSC boundary through a Next build.
import { generateReactHelpers } from '../../../../dist/browser.mjs';
import { UploadKitProvider } from '@uploadkitdev/react';
const { UploadButton } = generateReactHelpers();
export default function Upload() {
  return <UploadKitProvider endpoint="/api/uploadkit"><UploadButton route="media" /></UploadKitProvider>;
}
