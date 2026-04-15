# {{name}}

A [React Router v7](https://reactrouter.com) app (framework mode — the
successor to Remix) with file uploads powered by [UploadKit](https://uploadkit.dev).

This template ships a `_index.tsx` route with `<UploadDropzone />` from
`@uploadkitdev/react`, backed by an `action` at `app/routes/api.sign.ts` that
mints presigned PUT URLs server-side so the browser can upload directly to
storage — no server proxy, no bottleneck.

## Quick start

```bash
{{pkgManager}} dev
```

Then open [http://localhost:5173](http://localhost:5173) and drop a file.

## Next steps

1. **Get credentials.** Sign up at [uploadkit.dev/signup](https://uploadkit.dev/signup)
   for a managed UploadKit project, OR bring your own Cloudflare R2 / S3 bucket.
2. **Fill in `.env.local`.** The template ships with
   `UPLOADKIT_API_KEY=uk_test_placeholder` so the dev server boots cleanly.
   Replace it with your real key. If you're using BYOS, uncomment and set the
   `R2_*` vars.
3. **Read the docs.** The React Router guide lives at
   [docs.uploadkit.dev/react-router](https://docs.uploadkit.dev/react-router).

## Project structure

```
app/
├── root.tsx                  Root layout + global styles
├── entry.client.tsx          Client entry (hydration)
├── entry.server.tsx          Server entry (streaming SSR)
└── routes/
    ├── _index.tsx            Upload UI (UploadKitProvider + UploadDropzone)
    └── api.sign.ts           action() that returns presigned PUT URLs
```

## Scripts

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `{{pkgManager}} dev`       | Start the dev server (port 5173)     |
| `{{pkgManager}} build`     | Build for production                 |
| `{{pkgManager}} start`     | Serve the production build           |
| `{{pkgManager}} typecheck` | Generate route types + run `tsc`     |

---

© {{year}} {{name}}
