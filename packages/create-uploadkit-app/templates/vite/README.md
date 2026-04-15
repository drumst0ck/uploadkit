# {{name}}

A [Vite](https://vite.dev) + [React 19](https://react.dev) SPA with file uploads powered by [UploadKit](https://uploadkit.dev).

> **This template is for prototyping.** It's a pure single-page app with no
> backend — which means it **cannot sign upload URLs on its own**. For a
> production deployment you MUST pair this with a backend (BYOS). See the
> [BYOS section](#byos-bring-your-own-backend) below.

## Quick start

```bash
{{pkgManager}} dev
```

Then open [http://localhost:5173](http://localhost:5173). The dropzone will
render immediately. Uploads will fail until you wire up a backend — that's
intentional.

## BYOS (Bring Your Own Backend)

This template ships zero server code. You need to expose a single endpoint
on a backend of your choice that accepts a `POST` and returns a presigned
PUT URL. The dropzone calls it, then uploads the file directly to storage.

### Contract

```
POST ${VITE_UPLOADKIT_ENDPOINT}        (default: /api/sign)

Request body (JSON):
  { "filename": "photo.jpg", "contentType": "image/jpeg" }

Response body (JSON):
  { "url": "https://<your-bucket>.../presigned...", "key": "<object-key>", "method": "PUT" }
```

On receipt, the SPA does `fetch(url, { method: 'PUT', body: file, headers: { 'content-type': contentType } })`.

### Minimal examples

**Hono (Cloudflare Workers / Bun / Node):**

```ts
import { Hono } from 'hono';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = new Hono();

app.post('/api/sign', async (c) => {
  const { filename, contentType } = await c.req.json();
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const key = `${crypto.randomUUID()}-${filename}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );
  return c.json({ url, key, method: 'PUT' });
});

export default app;
```

**Express:**

```ts
import express from 'express';
// (same imports as above)

app.post('/api/sign', express.json(), async (req, res) => {
  // ...same body as the Hono handler
  res.json({ url, key, method: 'PUT' });
});
```

**Cloudflare Workers (no framework):** point `fetch` at the same logic and
return a `Response` with the JSON body.

### Dev proxy (optional)

During development, if your backend runs on a different port (say `8787`
for `wrangler dev`), add a proxy to `vite.config.ts` so `/api/sign` calls
from `http://localhost:5173` reach it:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8787',
  },
}
```

## Security

- **`VITE_*` vars are browser-exposed.** Vite inlines every `VITE_*` var
  into the client bundle at build time. Never put a `uk_live_*` key or R2
  secret behind a `VITE_*` prefix.
- **Live keys stay on the backend.** Your signing endpoint is the only
  place a live UploadKit key or R2 secret should live.

## Scripts

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `{{pkgManager}} dev`    | Start the Vite dev server           |
| `{{pkgManager}} build`  | Type-check and build for production |
| `{{pkgManager}} preview`| Preview the production build        |

## Next steps

1. **Get an UploadKit account.** Sign up at
   [uploadkit.dev/signup](https://uploadkit.dev/signup) to get a managed
   storage backend out-of-the-box — no BYOS required.
2. **Or wire up BYOS.** Implement the `/api/sign` contract above on any
   backend you like (see the Hono / Express / Workers snippets).
3. **Read the docs.** Full Vite + React guide at
   [docs.uploadkit.dev/vite](https://docs.uploadkit.dev/vite).

## TypeScript / JavaScript

This template currently only ships a TypeScript variant. A JavaScript
variant is on the roadmap but not yet available — the CLI will warn if
you pass `--no-typescript` to this template.

---

© {{year}} {{name}}
