import { createUploadKitHandler } from '@uploadkit/next';
import { uploadRouter } from './core';

const handler = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_API_KEY!,
  apiUrl: process.env.UPLOADKIT_API_URL ?? 'http://localhost:3002',
  router: uploadRouter,
});

export const { GET, POST } = handler;
