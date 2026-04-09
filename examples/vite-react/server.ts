import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressHandler } from '@uploadkit/next/express';
import type { FileRouter } from '@uploadkit/next';

const app = express();

// Allow requests from Vite dev server; tighten to your domain in production
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

const uploadRouter = {
  avatar: {
    maxFileSize: '2MB',
    maxFileCount: 1,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    middleware: async () => ({ uploadedBy: 'demo-user' }),
    onUploadComplete: async ({ file }) => {
      console.log('Avatar uploaded:', file.name, file.url);
    },
  },
  attachment: {
    maxFileSize: '10MB',
    maxFileCount: 5,
    middleware: async () => ({ uploadedBy: 'demo-user' }),
    onUploadComplete: async ({ file }) => {
      console.log('Attachment uploaded:', file.name);
    },
  },
} satisfies FileRouter;

// Mount the UploadKit handler — createExpressHandler adapts the Web API handler to Express
app.all('/api/uploadkit/:path(*)', createExpressHandler({
  apiKey: process.env.UPLOADKIT_API_KEY!,
  apiUrl: process.env.UPLOADKIT_API_URL ?? 'http://localhost:3002',
  router: uploadRouter,
}));

const PORT = process.env.PORT ?? 3011;
app.listen(PORT, () => {
  console.log(`UploadKit Express backend running on http://localhost:${PORT}`);
  console.log('Proxying /api/uploadkit to UploadKit managed storage');
});
