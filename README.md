<div align="center">

# UploadKit

**File uploads for developers. Beautifully.**

Open-source TypeScript SDK + 40+ premium React components + managed storage on Cloudflare R2 — with BYOS (Bring Your Own Storage) mode so you can use your own S3, R2, GCS, or Backblaze B2 bucket. 5 GB free forever.

[Website](https://uploadkit.dev) · [Docs](https://docs.uploadkit.dev) · [Dashboard](https://app.uploadkit.dev) · [Discord](https://discord.gg/mYgfVNfA2r) · [Changelog](https://uploadkit.dev/changelog)

[![npm: @uploadkitdev/react](https://img.shields.io/npm/v/@uploadkitdev/react?label=%40uploadkitdev%2Freact)](https://www.npmjs.com/package/@uploadkitdev/react) [![npm: @uploadkitdev/mcp](https://img.shields.io/npm/v/@uploadkitdev/mcp?label=%40uploadkitdev%2Fmcp)](https://www.npmjs.com/package/@uploadkitdev/mcp) [![Glama MCP score](https://glama.ai/mcp/servers/drumst0ck/uploadkit/badges/score.svg)](https://glama.ai/mcp/servers/drumst0ck/uploadkit) [![Awesome MCP Servers](https://awesome.re/mentioned-badge.svg)](https://github.com/punkpeye/awesome-mcp-servers)

</div>

---

## Install

```bash
pnpm add @uploadkitdev/react @uploadkitdev/next
```

## Drop it in

```tsx
import { UploadDropzone } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  return <UploadDropzone route="media" />;
}
```

That's it. You get a premium dropzone, dark mode, themeable via CSS variables, type-safe end-to-end.

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@uploadkitdev/core`](https://www.npmjs.com/package/@uploadkitdev/core) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/core?label=%20) | Framework-agnostic upload client (browser, Node, Edge) |
| [`@uploadkitdev/react`](https://www.npmjs.com/package/@uploadkitdev/react) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/react?label=%20) | 40+ premium React upload components |
| [`@uploadkitdev/next`](https://www.npmjs.com/package/@uploadkitdev/next) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/next?label=%20) | Next.js App Router handler + Express/Hono adapters |
| [`@uploadkitdev/mcp`](https://www.npmjs.com/package/@uploadkitdev/mcp) | ![npm](https://img.shields.io/npm/v/@uploadkitdev/mcp?label=%20) | Official MCP server for AI coding assistants |

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
  core        @uploadkitdev/core
  react       @uploadkitdev/react
  next        @uploadkitdev/next
  mcp         @uploadkitdev/mcp (stdio MCP server)
  mcp-core    shared MCP tool surface (internal)
  db          MongoDB models
  emails      React Email templates
  shared      types, errors, utilities
  ui          dashboard components
  config      shared tsconfig / eslint / tailwind base
```

## Tech stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript 5 · MongoDB + Mongoose · Cloudflare R2 · Auth.js v5 · Stripe · Resend + React Email · Fumadocs · Turborepo · pnpm · Changesets.

## Status

Version 1.0 shipped. Actively maintained. Community welcome on [Discord](https://discord.gg/mYgfVNfA2r).

## License

MIT © [Drumst0ck](https://github.com/drumst0ck) and contributors.
