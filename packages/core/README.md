# @uploadkit/core

[![npm version](https://img.shields.io/npm/v/@uploadkit/core)](https://www.npmjs.com/package/@uploadkit/core)
[![npm downloads](https://img.shields.io/npm/dm/@uploadkit/core)](https://www.npmjs.com/package/@uploadkit/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/uploadkit/uploadkit/actions/workflows/ci.yml/badge.svg)](https://github.com/uploadkit/uploadkit/actions/workflows/ci.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@uploadkit/core)](https://bundlephobia.com/package/@uploadkit/core)

Lightweight TypeScript client for UploadKit file uploads.

## Features

- **Presigned URL uploads** — files go directly to Cloudflare R2, never through your server
- **Automatic multipart** — files over 10 MB are split and uploaded in parallel
- **Progress tracking** — per-file progress callbacks with percentage
- **Retry with backoff** — configurable automatic retry on transient failures
- **Abort support** — cancel in-flight uploads with `AbortSignal`
- **BYOS compatible** — works with Bring Your Own Storage configuration
- **Zero dependencies** — ships with no runtime deps; `@uploadkit/shared` is bundled

## Install

```bash
# npm
npm install @uploadkit/core

# pnpm
pnpm add @uploadkit/core

# yarn
yarn add @uploadkit/core
```

## Quickstart

```typescript
import { createUploadKit } from '@uploadkit/core';

const client = createUploadKit({ apiKey: 'uk_live_...' });

// Pick a file (browser File object)
const file = document.querySelector<HTMLInputElement>('#file')!.files![0];

const result = await client.upload({
  file,
  route: 'imageUploader', // matches your file route name
  onProgress: (pct) => console.log(`${pct}% uploaded`),
});

console.log(result.url); // https://cdn.uploadkit.dev/...
```

## API Overview

### `createUploadKit(config)`

Factory function that returns an `UploadKitClient` instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — **(required)** | API key prefixed with `uk_live_` or `uk_test_` |
| `baseUrl` | `string` | `https://api.uploadkit.dev` | Override for self-hosted or testing |
| `maxRetries` | `number` | `3` | Number of retry attempts on transient failures |

### `client.upload(options)`

Upload a single file. Returns a `Promise<UploadResult>`.

| Option | Type | Description |
|--------|------|-------------|
| `file` | `File` | Browser `File` object to upload |
| `route` | `string` | File route name defined in your handler |
| `metadata` | `Record<string, unknown>` | Optional metadata stored with the file |
| `onProgress` | `(pct: number) => void` | Progress callback (0–100) |
| `signal` | `AbortSignal` | Cancel the upload via `AbortController` |

### `client.listFiles(options?)`

List files for the project linked to your API key.

| Option | Type | Description |
|--------|------|-------------|
| `limit` | `number` | Max files to return (default: 20) |
| `cursor` | `string` | Pagination cursor from previous response |

Returns `Promise<{ files: UploadResult[]; nextCursor?: string }>`.

### `client.deleteFile(key)`

Permanently delete a file by its storage key. Returns `Promise<void>`.

## Abort Uploads

```typescript
const controller = new AbortController();

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10_000);

await client.upload({
  file,
  route: 'imageUploader',
  signal: controller.signal,
});
```

## Links

- [Full documentation](https://docs.uploadkit.dev)
- [React components — @uploadkit/react](https://www.npmjs.com/package/@uploadkit/react)
- [Next.js adapter — @uploadkit/next](https://www.npmjs.com/package/@uploadkit/next)

## License

MIT
