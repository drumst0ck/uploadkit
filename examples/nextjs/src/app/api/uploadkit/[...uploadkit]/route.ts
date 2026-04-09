import { createUploadKitHandler } from '@uploadkit/next';
import { uploadRouter } from './core';

const handler = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_API_KEY!,
  router: uploadRouter,
});

export const { GET, POST } = handler;
