<div align="center">

# UploadKit

**File uploads for developers. Beautifully.**

Open-source TypeScript SDK + 40+ premium React components + managed storage on Cloudflare R2 — with BYOS (Bring Your Own Storage) mode so you can use your own S3, R2, GCS, or Backblaze B2 bucket. 5 GB free forever.

[Website](https://uploadkit.dev) · [Docs](https://docs.uploadkit.dev) · [Dashboard](https://app.uploadkit.dev) · [Discord](https://discord.gg/mYgfVNfA2r) · [Changelog](https://uploadkit.dev/changelog)

[![npm: @uploadkitdev/react](https://img.shields.io/npm/v/@uploadkitdev/react?label=%40uploadkitdev%2Freact)](https://www.npmjs.com/package/@uploadkitdev/react) [![npm: @uploadkitdev/mcp](https://img.shields.io/npm/v/@uploadkitdev/mcp?label=%40uploadkitdev%2Fmcp)](https://www.npmjs.com/package/@uploadkitdev/mcp) [![Glama MCP score](https://glama.ai/mcp/servers/drumst0ck/uploadkit/badges/score.svg)](https://glama.ai/mcp/servers/drumst0ck/uploadkit) [![Awesome MCP Servers](https://awesome.re/mentioned-badge.svg)](https://github.com/punkpeye/awesome-mcp-servers)

</div>

---

## Quickstart — add to an existing project

Most people land here with a Next.js app already running. Three steps:

```bash
pnpm add @uploadkitdev/react @uploadkitdev/next
```

Create `app/api/uploadkit/[...uploadkit]/route.ts`:

```ts
import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';

const router = {
  default: { maxFileSize: '4MB', allowedTypes: ['image/*'] },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  apiKey: process.env.UPLOADKIT_API_KEY!,
});
```

Wrap the root layout and drop in a dropzone:

```tsx
// app/layout.tsx
import { UploadKitProvider } from '@uploadkitdev/react';
// <UploadKitProvider endpoint="/api/uploadkit">{children}</UploadKitProvider>

// any page
import { UploadDropzone } from '@uploadkitdev/react';
// <UploadDropzone route="default" />
```

Set `UPLOADKIT_API_KEY=uk_live_...` in `.env.local` and you're done. Full walkthrough: [docs.uploadkit.dev/docs/getting-started/quickstart](https://docs.uploadkit.dev/docs/getting-started/quickstart).

### Starting a new project?

```bash
npx create-uploadkit-app my-app
```

Templates for **Next.js**, **SvelteKit**, **Remix**, and **Vite** — see the [CLI guide](https://docs.uploadkit.dev/docs/guides/cli).

### Using an AI-assistant IDE?

Install the [UploadKit MCP server](https://docs.uploadkit.dev/docs/guides/mcp) and let Claude Code, Cursor, Windsurf, or Zed wire the whole thing up for you:

```bash
npx -y @uploadkitdev/mcp
```

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@uploadkitdev/core`](https://www.npmjs.com/package/@uploadkitdev/core) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/core?label=%20) | Framework-agnostic upload client (browser, Node, Edge) |
| [`@uploadkitdev/react`](https://www.npmjs.com/package/@uploadkitdev/react) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/react?label=%20) | 40+ premium React upload components |
| [`@uploadkitdev/next`](https://www.npmjs.com/package/@uploadkitdev/next) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/next?label=%20) | Next.js App Router handler + Express/Hono adapters |
| [`@uploadkitdev/mcp`](https://www.npmjs.com/package/@uploadkitdev/mcp) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/mcp?label=%20) | Official MCP server for AI coding assistants |
| [`create-uploadkit-app`](https://www.npmjs.com/package/create-uploadkit-app) | ![npm](https://img.shields.io/npm/v/create-uploadkit-app?label=%20) | Scaffolder for new projects (Next, SvelteKit, Remix, Vite) |

## Component highlights

UploadKit ships 40+ components across 7 categories:

- **Classics** — `UploadButton`, `UploadDropzone`, `UploadModal`, `FileList`, `FilePreview`
- **Premium dropzones** — Glass (Vercel/Linear), Aurora (Apple), Terminal (Raycast), Brutal (Neo-brutalist), Minimal, Neon
- **Specialty** — `UploadAvatar`, `UploadInlineChat` (ChatGPT-style), `UploadStepWizard` (Stripe Checkout-style), `UploadEnvelope` (WeTransfer-style)
- **Motion / Progress** — `UploadProgressRadial`, `UploadProgressLiquid`, `UploadProgressOrbit`, `UploadCloudRain`, `UploadBento`, `UploadParticles`, `UploadDataStream` (Matrix/Warp-style)
- **Galleries** — `UploadGalleryGrid`, `UploadPolaroid`, `UploadTimeline`, `UploadKanban`, `UploadStickyBoard`

All are MIT-licensed, dark mode out of the box, themeable via CSS custom properties, and work with or without `motion` as a peer dep.

## BYOS — Bring Your Own Storage

Use the same SDK against your own bucket — zero frontend changes, credentials stay server-side.

```ts
import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';
import { createR2Storage } from '@uploadkitdev/next/byos';

const router = {
  media: { maxFileSize: '8MB', maxFileCount: 4, allowedTypes: ['image/*'] },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createR2Storage({
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    bucket: process.env.CLOUDFLARE_R2_BUCKET!,
  }),
});
```

Supported providers: **AWS S3** · **Cloudflare R2** · **Google Cloud Storage** · **Backblaze B2**.

## AI-native — MCP server

UploadKit ships an official [Model Context Protocol](https://modelcontextprotocol.io) server so Claude Code, Cursor, Windsurf, Zed, ChatGPT, and Claude.ai can generate UploadKit code with first-class knowledge of every component and scaffold.

**Stdio (IDE clients):**
```bash
npx -y @uploadkitdev/mcp
```

**Remote HTTP (ChatGPT / Claude.ai web):**
```
https://api.uploadkit.dev/api/v1/mcp
```

Full setup: [docs.uploadkit.dev/docs/guides/mcp](https://docs.uploadkit.dev/docs/guides/mcp) · Source: [`packages/mcp`](./packages/mcp) · Registry: [`io.github.drumst0ck/uploadkit`](https://registry.modelcontextprotocol.io)

## Monorepo layout

```
apps/
  web         Landing + pricing (uploadkit.dev)
  docs        Fumadocs site (docs.uploadkit.dev)
  dashboard   SaaS dashboard (app.uploadkit.dev)
  api         REST API + MCP remote endpoint (api.uploadkit.dev)
packages/
  core                  @uploadkitdev/core
  react                 @uploadkitdev/react
  next                  @uploadkitdev/next
  mcp                   @uploadkitdev/mcp (stdio MCP server)
  mcp-core              shared MCP tool surface (internal)
  create-uploadkit-app  scaffolder for new projects
  db                    MongoDB models
  emails                React Email templates
  shared                types, errors, utilities
  ui                    dashboard components
  config                shared tsconfig / eslint / tailwind base
```

## Tech stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript 5 · MongoDB + Mongoose · Cloudflare R2 · Auth.js v5 · Stripe · Resend + React Email · Fumadocs · Turborepo · pnpm · Changesets.

## Status

Version 1.0 shipped. Actively maintained. Community welcome on [Discord](https://discord.gg/mYgfVNfA2r).

## License

MIT © [Drumst0ck](https://github.com/drumst0ck) and contributors.
