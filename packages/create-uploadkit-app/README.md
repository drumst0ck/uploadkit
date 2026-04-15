# create-uploadkit-app

Scaffold a new project with [UploadKit](https://uploadkit.dev) — beautiful, type-safe file uploads in minutes.

## Usage

```bash
# pnpm
pnpm create uploadkit-app my-app

# npm
npm create uploadkit-app@latest my-app

# yarn
yarn create uploadkit-app my-app

# bun
bun create uploadkit-app my-app
```

Then follow the interactive prompts to pick a template:

- **next** — Next.js 16 (App Router) + Tailwind v4 + `@uploadkitdev/next` route handler
- **sveltekit** — SvelteKit + Svelte 5 with a presigned-URL endpoint
- **remix** — React Router v7 (framework mode) + `@uploadkitdev/react`
- **vite** — Vite + React 19 SPA (BYOS demo)

Every template ships a single working upload page — no auth, no DB, no Docker. Add what you need from there.

## Flags

| Flag | Description |
|------|-------------|
| `--template <name>` | Skip the template prompt. One of `next`, `sveltekit`, `remix`, `vite`. |
| `--pm <name>` | Skip the package-manager prompt. One of `pnpm`, `npm`, `yarn`, `bun`. |
| `--no-install` | Skip dependency install. |
| `--yes` / `-y` | Accept all defaults non-interactively. |
| `--version` / `-v` | Print version. |
| `--help` / `-h` | Print help. |

## Requirements

Node.js **>=20**.

## License

MIT © [Drumst0ck](https://github.com/drumst0ck)
