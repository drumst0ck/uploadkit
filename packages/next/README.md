# @uploadkitdev/next

[![npm version](https://img.shields.io/npm/v/@uploadkitdev/next)](https://www.npmjs.com/package/@uploadkitdev/next)
[![npm downloads](https://img.shields.io/npm/dm/@uploadkitdev/next)](https://www.npmjs.com/package/@uploadkitdev/next)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/drumst0ck/uploadkit/actions/workflows/ci.yml/badge.svg)](https://github.com/drumst0ck/uploadkit/actions/workflows/ci.yml)

Next.js App Router adapter for UploadKit with typed file routes.

## Features

- **File router pattern** — define upload rules once, enforce them everywhere
- **End-to-end type safety** — route names are inferred; mismatches are caught at compile time
- **Middleware support** — authenticate and enrich uploads in a single function
- **BYOS compatible** — swap to your own S3/R2 bucket with zero frontend changes
- **App Router native** — returns a standard Next.js Route Handler; no custom server needed

## Install

```bash
# npm
npm install @uploadkitdev/next

# pnpm
pnpm add @uploadkitdev/next

# yarn
yarn add @uploadkitdev/next
```

**Peer dependency:** `next >= 14`

## Quickstart

### 1. Define your file router

```typescript
// lib/upload.ts
import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';

export const fileRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    middleware: async ({ req }) => {
      // Authenticate the user, return metadata attached to every upload
      const user = await getCurrentUser(req);
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id };
    },
  },

  documentUploader: {
    maxFileSize: '16MB',
    allowedTypes: ['application/pdf'],
  },
} satisfies FileRouter;

export type OurFileRouter = typeof fileRouter;
```

### 2. Create the route handler

```typescript
// app/api/upload/route.ts
import { createUploadKitHandler } from '@uploadkitdev/next';
import { fileRouter } from '@/lib/upload';

const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  apiKey: process.env.UPLOADKIT_API_KEY!,
});

export { GET, POST };
```

### 3. Use in your React components

```typescript
// In your client component (with @uploadkitdev/react installed)
import { UploadButton } from '@uploadkitdev/react';

<UploadButton route="imageUploader" endpoint="/api/upload" />
```

## API Overview

### `createUploadKitHandler(config)`

Returns `{ GET, POST }` route handlers for Next.js App Router.

| Option | Type | Description |
|--------|------|-------------|
| `router` | `FileRouter` | Your file router definition |
| `apiKey` | `string` | UploadKit API key (`uk_live_...`) |

### `FileRouter` type

A record where each key is a route name and the value is a `RouteConfig`:

| Field | Type | Description |
|-------|------|-------------|
| `maxFileSize` | `string` | e.g. `"4MB"`, `"100KB"` |
| `maxFileCount` | `number` | Max files per upload request |
| `allowedTypes` | `string[]` | MIME types allowed |
| `middleware` | `async ({ req }) => metadata` | Auth + metadata function |

### `generateReactHelpers(router)`

Generates type-safe component wrappers that infer route names from your `FileRouter`.

```typescript
import { generateReactHelpers } from '@uploadkitdev/next';
import type { OurFileRouter } from '@/lib/upload';

export const { UploadButton, UploadDropzone } =
  generateReactHelpers<OurFileRouter>();
```

## BYOS (Bring Your Own Storage)

Pass your own S3-compatible credentials in the handler config. Presigned URL generation happens server-side — credentials never reach the browser.

```typescript
const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  apiKey: process.env.UPLOADKIT_API_KEY!,
  storage: {
    endpoint: process.env.R2_ENDPOINT!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET!,
  },
});
```

## Links

- [Full documentation](https://docs.uploadkit.dev)
- [Core SDK — @uploadkitdev/core](https://www.npmjs.com/package/@uploadkitdev/core)
- [React components — @uploadkitdev/react](https://www.npmjs.com/package/@uploadkitdev/react)

## License

MIT
