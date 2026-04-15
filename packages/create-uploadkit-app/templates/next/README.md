# {{name}}

A [Next.js](https://nextjs.org) app with file uploads powered by [UploadKit](https://uploadkit.dev).

## Quick start

```bash
{{pkgManager}} dev
```

Then open [http://localhost:3000](http://localhost:3000) and drop a file.

## Next steps

1. **Get a real API key.** Sign up at [uploadkit.dev/signup](https://uploadkit.dev/signup),
   create a project, and copy the `uk_test_…` / `uk_live_…` key from the dashboard.
2. **Wire it up.** Replace `UPLOADKIT_API_KEY` in `.env.local` with your key.
3. **Read the docs.** The Next.js guide lives at
   [docs.uploadkit.dev/nextjs](https://docs.uploadkit.dev/nextjs).

## Project structure

```
app/
├── layout.tsx              Root layout (loads UploadKit's CSS + Tailwind)
├── page.tsx                Home page with <UploadDropzone />
├── globals.css             Tailwind v4 entry
└── api/
    └── uploadkit/
        └── [...uploadkit]/
            └── route.ts    Server-side route handler (holds API key)
```

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `{{pkgManager}} dev`   | Start the dev server (Turbopack)  |
| `{{pkgManager}} build` | Build for production              |
| `{{pkgManager}} start` | Run the production build          |

---

© {{year}} {{name}}
