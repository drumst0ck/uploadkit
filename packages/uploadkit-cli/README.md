# uploadkit

**Add UploadKit to your existing app in under 60 seconds.**

`uploadkit` is the CLI for installing [UploadKit](https://uploadkit.dev) into
projects you already have. Point it at a Next.js, SvelteKit, Remix (React
Router 7), or Vite + React repo and it wires up everything you need — route
handler, provider, env vars, and dependencies — backed by a backup-and-restore
pipeline so you can roll back at any time.

> Starting a brand-new project? Use [`create-uploadkit-app`](https://www.npmjs.com/package/create-uploadkit-app)
> instead. This CLI is for **existing** codebases.

## Quickstart

```sh
npx uploadkit init
```

That's it. Answer the prompts and you'll have:

- `@uploadkitdev/*` packages installed (pinned to the latest published versions)
- A route handler at the framework's canonical API path
- `UploadKitProvider` mounted in your root layout
- `.env.local` (or `.env`) scaffolded with the keys you need
- Every modified file backed up to `.uploadkit-backup/<timestamp>/`

Run it again and it prints `already configured` — fully idempotent.

### Per-framework behavior

| Framework | Route handler | Provider mount |
|-----------|---------------|----------------|
| Next.js App Router | `app/api/uploadkit/[...uploadkit]/route.ts` | `app/layout.tsx` wraps `<body>` children |
| SvelteKit | `src/routes/api/uploadkit/[...uploadkit]/+server.ts` | Typed client in `src/lib/uploadkit.ts` (no React provider) |
| Remix / React Router 7 | `app/routes/api.uploadkit.$.tsx` | `app/root.tsx` wraps children |
| Vite + React | _(no server)_ | `src/main.tsx` or `src/App.tsx` — prints a BYOS warning |

Next.js Pages Router, Vue, Nuxt, Angular, and Astro are not supported in
0.1.x — the CLI will refuse with a clear message instead of making a mess.

## Adding components shadcn-style

```sh
npx uploadkit add dropzone
npx uploadkit add button
npx uploadkit add modal
npx uploadkit add gallery
npx uploadkit add queue
npx uploadkit add progress
```

Each component inserts into a page of your choice, bounded by
`// uploadkit:start` / `// uploadkit:end` markers. Re-running `add` on an
existing component is a no-op.

Available today (0.1.0):

| Alias | SDK component |
|-------|---------------|
| `dropzone` | `UploadDropzone` |
| `button` | `UploadButton` |
| `modal` | `UploadModal` |
| `gallery` | `UploadGalleryGrid` |
| `queue` | `FileList` |
| `progress` | `UploadProgressBar` |

> `add` is React-only. SvelteKit components will ship alongside SDK Svelte
> variants in a future release.

## Rolling back

Every file the CLI touches is copied to `.uploadkit-backup/<ISO-timestamp>/`
with a `manifest.json`. To undo an `init` (or any `add`):

```sh
npx uploadkit restore
```

You'll be prompted to pick a backup timestamp, then the CLI replays the
manifest in reverse: restores modified files, deletes files the CLI created,
rewinds `.env.local` entries it added.

## Command reference

```
uploadkit init [--yes] [--skip-install]
uploadkit add <component> [--target <path>] [--yes]
uploadkit restore [--timestamp <iso>]
uploadkit --version
uploadkit --help
```

| Flag | Applies to | Description |
|------|-----------|-------------|
| `--yes` / `-y` | `init`, `add` | Accept all defaults, non-interactive. Useful in CI. |
| `--skip-install` | `init` | Don't run the package manager after wiring — you'll install yourself. |
| `--target <path>` | `add` | Explicit page/route to insert the component into. |
| `--timestamp <iso>` | `restore` | Jump straight to a specific backup (skips the picker). |

## Requirements

- **Node.js 20+**
- A repo with `package.json` at the CWD (monorepo-aware installs are not
  supported in 0.1.x — run from the package root)

## Troubleshooting

**"Framework not detected"** — the CLI reads `package.json` deps first, then
framework config files. If you've customized the build (webpack, rspack,
esbuild-alone), detection may bail. Open an issue with your `package.json`.

**"Already configured"** — `init` found `uploadkit:start` markers in a target
file. Either you're already set up, or you previously ran `init` and the
markers survived. Run `uploadkit restore` to roll back, or edit the files by
hand.

**Presigned uploads on Vite** — Vite has no server, so uploads use
BYOS + presigned URLs. The CLI warns you at `init` time; point
`UPLOADKIT_UPLOAD_URL` at your own endpoint.

## Links

- Docs: <https://uploadkit.dev/docs/guides/cli-existing-projects>
- Dashboard: <https://dashboard.uploadkit.dev>
- GitHub: <https://github.com/drumst0ck/uploadkit>
- Issues: <https://github.com/drumst0ck/uploadkit/issues>

## License

MIT © Drumst0ck
