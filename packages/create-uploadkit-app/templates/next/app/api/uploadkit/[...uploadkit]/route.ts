import { createUploadKitHandler } from '@uploadkitdev/next';
import { uploadRouter } from './core';

/**
 * The UploadKit route handler. It holds your server-side API key — that key
 * NEVER ships to the browser. The client components talk to this endpoint
 * via the `<UploadKitProvider endpoint="/api/uploadkit" />` context.
 */
const handler = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_API_KEY ?? 'uk_test_placeholder',
  router: uploadRouter,
});

export const { GET, POST } = handler;
