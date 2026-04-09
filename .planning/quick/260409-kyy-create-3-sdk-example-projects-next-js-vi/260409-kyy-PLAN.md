---
phase: quick-260409-kyy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pnpm-workspace.yaml
  - examples/nextjs/package.json
  - examples/nextjs/tsconfig.json
  - examples/nextjs/next.config.ts
  - examples/nextjs/.env.local.example
  - examples/nextjs/README.md
  - examples/nextjs/src/app/layout.tsx
  - examples/nextjs/src/app/page.tsx
  - examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts
  - examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts
  - examples/vite-react/package.json
  - examples/vite-react/tsconfig.json
  - examples/vite-react/vite.config.ts
  - examples/vite-react/index.html
  - examples/vite-react/.env.example
  - examples/vite-react/README.md
  - examples/vite-react/server.ts
  - examples/vite-react/src/main.tsx
  - examples/vite-react/src/App.tsx
  - examples/express-api/package.json
  - examples/express-api/tsconfig.json
  - examples/express-api/.env.example
  - examples/express-api/README.md
  - examples/express-api/src/index.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "examples/nextjs demonstrates App Router integration with UploadButton, UploadDropzone, and UploadModal"
    - "examples/vite-react demonstrates Vite + React client with Express backend using createExpressHandler"
    - "examples/express-api demonstrates server-side only usage with createUploadKit client and createExpressHandler"
    - "All three examples use workspace:* for @uploadkit/* dependencies"
    - "pnpm-workspace.yaml includes examples/* glob"
    - "Each example has .env.example and README.md with 2-3 step setup"
  artifacts:
    - path: examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts
      provides: FileRouter definition (imageUploader, documentUploader routes)
    - path: examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts
      provides: createUploadKitHandler export as GET/POST
    - path: examples/vite-react/server.ts
      provides: Express server with createExpressHandler and FileRouter
    - path: examples/express-api/src/index.ts
      provides: Express server with createUploadKit client + file management endpoints
    - path: pnpm-workspace.yaml
      provides: examples/* workspace glob added
  key_links:
    - from: examples/nextjs/src/app/layout.tsx
      to: examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts
      via: NextSSRPlugin + extractRouterConfig
    - from: examples/vite-react/src/App.tsx
      to: examples/vite-react/server.ts
      via: Vite proxy /api/uploadkit -> localhost:3011
    - from: examples/express-api/src/index.ts
      to: "@uploadkit/core createUploadKit"
      via: listFiles/deleteFile server-side calls
---

<objective>
Create three self-contained SDK example projects in `examples/` that demonstrate UploadKit end-to-end across the major integration patterns.

Purpose: Developers evaluating or testing the SDK need runnable reference implementations. These examples cover the three primary deployment scenarios: Next.js App Router (most common), Vite + React + Express (SPA + backend), and Express-only (server-side file management).

Output: Three ready-to-run example projects added to the pnpm workspace, plus an updated pnpm-workspace.yaml.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Key SDK facts derived from source:
- UploadKitProvider takes `endpoint` (not apiKey) — API key never in browser
- createUploadKitHandler returns `{ GET, POST }` — export both from route.ts
- ctx.params is a Promise in Next.js 16: `const params = await ctx.params`
- createExpressHandler is at `@uploadkit/next/express` subpath export
- NextSSRPlugin + extractRouterConfig are at `@uploadkit/next` (not a subpath)
- createUploadKit (UploadKitClient) is at `@uploadkit/core` — server-side only
- FileRouter uses `satisfies FileRouter` pattern (not type annotation) for type inference
- Express wildcard pattern: `app.all('/api/uploadkit/*', handler)` — req.params[0] is the segment
- UploadKitHandlerConfig fields: router, apiKey (optional), apiUrl (optional), storage (BYOS, optional)
- allowedTypes accepts MIME strings like 'image/*', 'image/jpeg', 'application/pdf'
</context>

<tasks>

<task type="auto">
  <name>Task 1: examples/nextjs — Next.js App Router example</name>
  <files>
    pnpm-workspace.yaml,
    examples/nextjs/package.json,
    examples/nextjs/tsconfig.json,
    examples/nextjs/next.config.ts,
    examples/nextjs/.env.local.example,
    examples/nextjs/README.md,
    examples/nextjs/src/app/layout.tsx,
    examples/nextjs/src/app/page.tsx,
    examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts,
    examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts
  </files>
  <action>
First, update pnpm-workspace.yaml to add `- "examples/*"` alongside the existing `apps/*` and `packages/*` entries.

Then create the Next.js example. Do NOT run pnpm install.

**pnpm-workspace.yaml** — add `  - "examples/*"` to the packages list.

**examples/nextjs/package.json:**
```json
{
  "name": "@uploadkit/example-nextjs",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev -p 3010",
    "build": "next build",
    "start": "next start -p 3010"
  },
  "dependencies": {
    "next": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@uploadkit/next": "workspace:*",
    "@uploadkit/react": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**examples/nextjs/tsconfig.json:**
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "declaration": false,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next.config.ts"],
  "exclude": ["node_modules"]
}
```

**examples/nextjs/next.config.ts:**
```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@uploadkit/react', '@uploadkit/next', '@uploadkit/core'],
};

export default config;
```

**examples/nextjs/.env.local.example:**
```
UPLOADKIT_API_KEY=uk_live_your_api_key_here
```

**examples/nextjs/README.md:**
```markdown
# UploadKit — Next.js App Router Example

Demonstrates UploadButton, UploadDropzone, and UploadModal with the Next.js App Router.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your API key from [app.uploadkit.dev](https://app.uploadkit.dev)
2. `pnpm install` from the monorepo root
3. `pnpm dev` (or `pnpm --filter @uploadkit/example-nextjs dev`) — opens on http://localhost:3010
```

**examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts:**
```typescript
import type { FileRouter } from '@uploadkit/next';

export const uploadRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 4,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    middleware: async ({ req: _req }) => {
      // In a real app, authenticate the user here and return metadata
      return { uploadedBy: 'demo-user' };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Image upload complete:', file.name, 'by', metadata.uploadedBy);
      return { url: file.url };
    },
  },
  documentUploader: {
    maxFileSize: '16MB',
    maxFileCount: 1,
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    middleware: async () => ({ uploadedBy: 'demo-user' }),
    onUploadComplete: async ({ file }) => {
      console.log('Document uploaded:', file.name);
    },
  },
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
```

**examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts:**
```typescript
import { createUploadKitHandler } from '@uploadkit/next';
import { uploadRouter } from './core';

const handler = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_API_KEY!,
  router: uploadRouter,
});

export const { GET, POST } = handler;
```

**examples/nextjs/src/app/layout.tsx:**
```typescript
import type { ReactNode } from 'react';
import { NextSSRPlugin, extractRouterConfig } from '@uploadkit/next';
import '@uploadkit/react/styles.css';
import { uploadRouter } from './api/uploadkit/[...uploadkit]/core';

export const metadata = {
  title: 'UploadKit — Next.js Example',
  description: 'Example app demonstrating UploadKit with Next.js App Router',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0b', color: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <NextSSRPlugin routerConfig={extractRouterConfig(uploadRouter)} />
        {children}
      </body>
    </html>
  );
}
```

**examples/nextjs/src/app/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { UploadKitProvider, UploadButton, UploadDropzone, UploadModal } from '@uploadkit/react';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>UploadKit — Next.js Example</h1>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadButton (Images, max 4MB each)</h2>
          <UploadButton
            route="imageUploader"
            onUploadComplete={(res) => {
              console.log('Upload complete:', res);
              alert(`Uploaded: ${res.name}`);
            }}
            onUploadError={(err) => {
              console.error('Upload error:', err);
              alert(`Error: ${err.message}`);
            }}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadDropzone (Documents, max 16MB)</h2>
          <UploadDropzone
            route="documentUploader"
            config={{ mode: 'manual' }}
            onUploadComplete={(results) => {
              console.log('Documents uploaded:', results);
              alert(`Uploaded ${Array.isArray(results) ? results.length : 1} document(s)`);
            }}
            onUploadError={(err) => console.error('Upload error:', err)}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadModal (Images)</h2>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--uk-accent, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Open Upload Modal
          </button>
          <UploadModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            route="imageUploader"
            title="Upload Images"
            onUploadComplete={(res) => {
              console.log('Modal upload complete:', res);
              setModalOpen(false);
            }}
          />
        </section>
      </main>
    </UploadKitProvider>
  );
}
```
  </action>
  <verify>All files exist: `ls examples/nextjs/src/app/api/uploadkit/\\[...uploadkit\\]/route.ts examples/nextjs/src/app/page.tsx examples/nextjs/package.json` and pnpm-workspace.yaml contains `examples/*`.</verify>
  <done>
    - pnpm-workspace.yaml includes `- "examples/*"`
    - examples/nextjs has all 10 files listed
    - route.ts exports `{ GET, POST }` from createUploadKitHandler
    - core.ts uses `satisfies FileRouter` pattern
    - layout.tsx uses NextSSRPlugin + extractRouterConfig from '@uploadkit/next'
    - page.tsx is a 'use client' component wrapping all three upload components in UploadKitProvider
    - .env.local.example and README.md present
  </done>
</task>

<task type="auto">
  <name>Task 2: examples/vite-react — Vite + React + Express example</name>
  <files>
    examples/vite-react/package.json,
    examples/vite-react/tsconfig.json,
    examples/vite-react/vite.config.ts,
    examples/vite-react/index.html,
    examples/vite-react/.env.example,
    examples/vite-react/README.md,
    examples/vite-react/server.ts,
    examples/vite-react/src/main.tsx,
    examples/vite-react/src/App.tsx
  </files>
  <action>
Create the Vite + React example. Do NOT run pnpm install.

**examples/vite-react/package.json:**
```json
{
  "name": "@uploadkit/example-vite",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch server.ts\"",
    "dev:client": "vite",
    "dev:server": "tsx server.ts",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@uploadkit/react": "workspace:*",
    "@uploadkit/next": "workspace:*",
    "express": "^5.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "concurrently": "^9.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.0"
  }
}
```

**examples/vite-react/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "declaration": false,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "server.ts", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**examples/vite-react/vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/uploadkit': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
    },
  },
});
```

**examples/vite-react/index.html:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UploadKit — Vite + React Example</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**examples/vite-react/.env.example:**
```
UPLOADKIT_API_KEY=uk_live_your_api_key_here
```

**examples/vite-react/README.md:**
```markdown
# UploadKit — Vite + React Example

Demonstrates UploadKit with a Vite + React frontend and an Express backend.
The Express server uses `createExpressHandler` from `@uploadkit/next/express`.

## Setup

1. Copy `.env.example` to `.env` and add your API key from [app.uploadkit.dev](https://app.uploadkit.dev)
2. `pnpm install` from the monorepo root
3. `pnpm dev` — starts Vite (port 5173) and Express (port 3011) concurrently

The Vite dev server proxies `/api/uploadkit` to the Express backend.
```

**examples/vite-react/server.ts:**
```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressHandler } from '@uploadkit/next/express';
import type { FileRouter } from '@uploadkit/next';

const app = express();

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
app.all('/api/uploadkit/*', createExpressHandler({
  apiKey: process.env.UPLOADKIT_API_KEY!,
  router: uploadRouter,
}));

const PORT = process.env.PORT ?? 3011;
app.listen(PORT, () => {
  console.log(`UploadKit Express backend running on http://localhost:${PORT}`);
  console.log('Proxying /api/uploadkit to UploadKit managed storage');
});
```

**examples/vite-react/src/main.tsx:**
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@uploadkit/react/styles.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**examples/vite-react/src/App.tsx:**
```typescript
import { UploadKitProvider, UploadButton, UploadDropzone } from '@uploadkit/react';

export default function App() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#0a0a0b',
        minHeight: '100vh',
        color: '#fafafa',
      }}>
        <h1 style={{ marginBottom: '0.5rem' }}>UploadKit — Vite + React</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '3rem' }}>
          Frontend: Vite 6 + React 19 &nbsp;|&nbsp; Backend: Express 5 + createExpressHandler
        </p>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Avatar Upload (JPEG/PNG/WebP, max 2MB)</h2>
          <UploadButton
            route="avatar"
            onUploadComplete={(res) => {
              console.log('Avatar uploaded:', res);
              alert(`Uploaded: ${res.name}`);
            }}
            onUploadError={(err) => console.error('Error:', err)}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Attachments (any type, max 5 files, 10MB each)</h2>
          <UploadDropzone
            route="attachment"
            config={{ mode: 'manual' }}
            onUploadComplete={(results) => {
              const files = Array.isArray(results) ? results : [results];
              console.log('Attachments uploaded:', files);
              alert(`Uploaded ${files.length} file(s)`);
            }}
            onUploadError={(err) => console.error('Error:', err)}
          />
        </section>
      </div>
    </UploadKitProvider>
  );
}
```
  </action>
  <verify>All files exist: `ls examples/vite-react/server.ts examples/vite-react/src/App.tsx examples/vite-react/package.json`</verify>
  <done>
    - examples/vite-react has all 9 files listed
    - server.ts imports createExpressHandler from '@uploadkit/next/express'
    - server.ts mounts handler at '/api/uploadkit/*' (wildcard for Express segment extraction)
    - vite.config.ts proxies /api/uploadkit to localhost:3011
    - App.tsx uses UploadKitProvider with endpoint="/api/uploadkit"
    - .env.example and README.md present
  </done>
</task>

<task type="auto">
  <name>Task 3: examples/express-api — Express server-side only example</name>
  <files>
    examples/express-api/package.json,
    examples/express-api/tsconfig.json,
    examples/express-api/.env.example,
    examples/express-api/README.md,
    examples/express-api/src/index.ts
  </files>
  <action>
Create the Express server-side only example. Do NOT run pnpm install.

**examples/express-api/package.json:**
```json
{
  "name": "@uploadkit/example-express",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@uploadkit/core": "workspace:*",
    "@uploadkit/next": "workspace:*",
    "express": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/express": "^5.0.0"
  }
}
```

**examples/express-api/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "allowJs": true,
    "declaration": false,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**examples/express-api/.env.example:**
```
UPLOADKIT_API_KEY=uk_live_your_api_key_here
# Optional: override the UploadKit API base URL (defaults to https://api.uploadkit.dev)
# UPLOADKIT_API_URL=https://api.uploadkit.dev
```

**examples/express-api/README.md:**
```markdown
# UploadKit — Express API Example

Demonstrates server-side only usage: upload handling via `createExpressHandler` and
file management (list, delete) via the `createUploadKit` core client.

No frontend — use curl or any HTTP client to interact with the endpoints.

## Setup

1. Copy `.env.example` to `.env` and add your API key from [app.uploadkit.dev](https://app.uploadkit.dev)
2. `pnpm install` from the monorepo root
3. `pnpm dev` — starts Express on http://localhost:3012

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/uploadkit/files | UploadKit handler (used by SDK clients) |
| GET | /files | List uploaded files (server-side, 20 results) |
| DELETE | /files/:key | Delete a file by storage key |
| GET | /health | Health check |

## Example Requests

```bash
# List files
curl http://localhost:3012/files

# Delete a file
curl -X DELETE http://localhost:3012/files/files%2Fabc123%2Fdocument.pdf
```
```

**examples/express-api/src/index.ts:**
```typescript
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
app.all('/api/uploadkit/*', createExpressHandler({
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
app.delete('/files/:key(*)', async (req, res) => {
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
  console.log('Endpoints: GET /files | DELETE /files/:key | GET/POST /api/uploadkit/files');
});
```
  </action>
  <verify>All files exist: `ls examples/express-api/src/index.ts examples/express-api/package.json examples/express-api/README.md`</verify>
  <done>
    - examples/express-api has all 5 files listed
    - src/index.ts imports createUploadKit from '@uploadkit/core' (server-side client)
    - src/index.ts imports createExpressHandler from '@uploadkit/next/express'
    - listFiles and deleteFile demonstrate the core client's file management API
    - /api/uploadkit/* wildcard handler is mounted for SDK client integration
    - .env.example and README.md with curl examples present
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → /api/uploadkit | Client sends file metadata; API key never in browser |
| server → UploadKit API | apiKey transmitted server-side only via Authorization header |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-kyy-01 | Information Disclosure | example .env files | accept | .env.example uses placeholder `uk_live_your_api_key_here` — no real keys ever committed |
| T-kyy-02 | Elevation of Privilege | server.ts CORS origin | mitigate | cors({ origin: [...] }) restricts to localhost dev origins only; must be tightened in production |
| T-kyy-03 | Spoofing | express-api /files/:key | accept | Examples are non-authenticated demo servers; README notes real apps should add auth middleware |
</threat_model>

<verification>
After all three tasks complete, verify the workspace recognizes the examples:

```bash
# All three package.json files present
ls examples/nextjs/package.json examples/vite-react/package.json examples/express-api/package.json

# workspace.yaml includes examples
grep "examples" pnpm-workspace.yaml

# All route handlers present
ls "examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts"
ls examples/vite-react/server.ts
ls examples/express-api/src/index.ts

# No real API keys in examples (must only show placeholder)
grep -r "uk_live_" examples/ --include="*.example" --include="*.ts"
```
</verification>

<success_criteria>
- pnpm-workspace.yaml contains `examples/*`
- Three example directories exist with complete file sets
- Each example uses `workspace:*` for all `@uploadkit/*` dependencies
- No `@uploadkit/react` package uses apiKey directly (proxy pattern enforced)
- Each `.env.example` / `.env.local.example` contains only placeholder values
- Each `README.md` has setup instructions in 3 steps or fewer
- No `pnpm install` was run (file creation only)
</success_criteria>

<output>
After completion, create `.planning/quick/260409-kyy-create-3-sdk-example-projects-next-js-vi/260409-kyy-SUMMARY.md` with:
- Files created (count + list)
- Key patterns demonstrated per example
- Any deviations from the plan and why
</output>
