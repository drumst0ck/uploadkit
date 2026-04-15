# create-uploadkit-app

Scaffold a brand-new [UploadKit](https://uploadkit.dev) project — beautiful, type-safe file uploads in minutes.

> **Already have a project?** This CLI is for **new** projects. To add UploadKit to an existing app, run `pnpm add @uploadkitdev/react @uploadkitdev/next` and follow the [Quickstart](https://docs.uploadkit.dev/docs/getting-started/quickstart).

## 30-second start

```bash
npx create-uploadkit-app my-app
```

It asks two questions (template + package manager), wires up a working upload page, initializes git, and installs dependencies. That's it.

Other package managers:

```bash
pnpm create uploadkit-app my-app
yarn create uploadkit-app my-app
bun create uploadkit-app my-app
```

## Templates

| Template | Framework | What you get |
|----------|-----------|--------------|
| `next` | Next.js 16 App Router + Tailwind v4 | Route handler at `app/api/uploadkit/[...uploadkit]/route.ts`, `UploadKitProvider` in the root layout, `<UploadDropzone>` on `/`. |
| `sveltekit` | SvelteKit + Svelte 5 | Presigned-URL endpoint + single upload page. |
| `remix` | React Router v7 (framework mode) | Route handler + managed-mode upload page. |
| `vite` | Vite SPA + React 19 | BYOS demo with a minimal backend stub. |

Every template ships a single working upload page — no auth, no DB, no Docker. Add what you need.

## Flags

| Flag | Description |
|------|-------------|
| `--template <id>` / `-t` | One of `next`, `sveltekit`, `remix`, `vite`. |
| `--pm <name>` | One of `pnpm`, `npm`, `yarn`, `bun`. |
| `--yes` / `-y` | Accept all defaults non-interactively. |
| `--no-install` | Skip dependency install. |
| `--no-git` | Skip `git init` and initial commit. |
| `--force` | Scaffold into a non-empty target directory. |
| `--version` / `-v` | Print version. |
| `--help` / `-h` | Print help. |

### Non-interactive example

```bash
npx create-uploadkit-app my-app --template next --pm pnpm --yes
```

## Requirements

Node.js **>=20**.

## Full docs

Full reference with per-template details and troubleshooting: **[docs.uploadkit.dev/docs/guides/cli](https://docs.uploadkit.dev/docs/guides/cli)**.

## License

MIT © [Drumst0ck](https://github.com/drumst0ck)
