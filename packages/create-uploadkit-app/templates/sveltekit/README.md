# {{name}}

A [SvelteKit](https://svelte.dev/docs/kit) app with file uploads powered by [UploadKit](https://uploadkit.dev).

This template uses the raw presigned-URL flow — no React SDK, no framework-specific
package. SvelteKit's `+server.ts` endpoint issues a presigned PUT URL, and the
browser uploads the file directly to storage. Same primitives the official SDK
uses under the hood.

## Quick start

```bash
{{pkgManager}} dev
```

Then open [http://localhost:5173](http://localhost:5173) and pick a file.

## Next steps

1. **Get credentials.** Sign up at [uploadkit.dev/signup](https://uploadkit.dev/signup)
   for a managed UploadKit project, OR bring your own Cloudflare R2 / S3 bucket.
2. **Fill in `.env.local`.** The template ships with `UPLOADKIT_API_KEY=uk_test_placeholder`
   so the dev server boots cleanly. Replace it with your real key. If you're using
   BYOS, uncomment the `R2_*` vars and set them.
3. **Read the docs.** The SvelteKit guide lives at
   [docs.uploadkit.dev/sveltekit](https://docs.uploadkit.dev/sveltekit).

## Project structure

```
src/
├── app.html                   Root HTML shell
├── app.d.ts                   Ambient types
└── routes/
    ├── +page.svelte           Upload UI (Svelte 5 runes)
    └── api/
        └── sign/
            └── +server.ts     Presigned PUT URL endpoint
```

## Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `{{pkgManager}} dev`    | Start the dev server            |
| `{{pkgManager}} build`  | Build for production            |
| `{{pkgManager}} preview`| Preview the production build    |
| `{{pkgManager}} check`  | Run `svelte-check` type checks  |

---

© {{year}} {{name}}
