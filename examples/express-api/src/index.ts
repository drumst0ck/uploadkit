import 'dotenv/config';
import express from 'express';
import { createUploadKit } from '@uploadkit/core';
import { createExpressHandler } from '@uploadkit/next/express';
import type { FileRouter } from '@uploadkit/next';

const app = express();
app.use(express.json());

// Validate required env vars at startup
if (!process.env.UPLOADKIT_API_KEY) {
  console.error('ERROR: UPLOADKIT_API_KEY is required. Copy .env.example to .env and fill in your key.');
  process.exit(1);
}

// Server-side SDK client for file management operations
// createUploadKit is NEVER called in browser code — API key stays server-side
const uk = createUploadKit({
  apiKey: process.env.UPLOADKIT_API_KEY,
  baseUrl: process.env.UPLOADKIT_API_URL ?? 'https://api.uploadkit.dev',
});

// File router — defines upload rules for different upload types
const uploadRouter = {
  files: {
    maxFileSize: '50MB',
    maxFileCount: 10,
    middleware: async ({ req: _req }) => {
      // Add auth or context here in a real app
      return { source: 'express-api-example' };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log(`File uploaded: ${file.name} (${file.size} bytes) — source: ${metadata.source}`);
      console.log(`URL: ${file.url}`);
    },
  },
} satisfies FileRouter;

// Upload handler — SDK clients POST here to get presigned URLs and confirm uploads
app.all('/api/uploadkit/{*path}', createExpressHandler({
  apiKey: process.env.UPLOADKIT_API_KEY,
  router: uploadRouter,
}));

// List files — server-side call to UploadKit API using the core client
app.get('/files', async (_req, res) => {
  try {
    const result = await uk.listFiles({ limit: 20 });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Delete file by storage key — note: key may contain slashes, use encodeURIComponent on client
app.delete('/files/{*key}', async (req, res) => {
  try {
    const key = req.params.key;
    if (!key) {
      res.status(400).json({ error: 'key is required' });
      return;
    }
    await uk.deleteFile(key);
    res.json({ ok: true, deleted: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'uploadkit-example-express' });
});

const PORT = process.env.PORT ?? 3012;
app.listen(PORT, () => {
  console.log(`UploadKit Express API running on http://localhost:${PORT}`);
  console.log('Endpoints: GET /files | DELETE /files/:key | GET/POST /api/uploadkit/*');
});
