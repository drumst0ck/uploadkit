# UploadKit — Vite + React Example

Demonstrates UploadKit with a Vite + React frontend and an Express backend.
The Express server uses `createExpressHandler` from `@uploadkit/next/express`.

## Setup

1. Copy `.env.example` to `.env` and add your API key from [app.uploadkit.dev](https://app.uploadkit.dev)
2. `pnpm install` from the monorepo root
3. `pnpm dev` — starts Vite (port 5173) and Express (port 3011) concurrently

The Vite dev server proxies `/api/uploadkit` to the Express backend.
