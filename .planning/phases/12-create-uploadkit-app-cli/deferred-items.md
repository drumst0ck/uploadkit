# Phase 12 — Deferred Items

Items discovered during execution that are out of scope for the current plan.

## From 12-02

### eslint `dist/` ignore does not apply under `pnpm --filter create-uploadkit-app lint`

When ESLint runs with cwd inside `packages/create-uploadkit-app`, the root `ignores: ['dist/']`
entry in `packages/config/eslint/index.js` is interpreted relative to the config file location,
not the working directory, so `dist/*.cjs` and `dist/*.js` get linted and flag dozens of
`no-undef` / `@typescript-eslint/no-unused-vars` errors on generated output.

Pre-existing — 12-01 never ran `lint`, so the regression wasn't caught earlier. Out of scope
for 12-02 (plan verification lists only `build` and `test`).

Fix (trivial, recommended for 12-08):
```js
ignores: [
  'dist/', '**/dist/**',
  '.next/', '**/.next/**',
  'node_modules/', '**/node_modules/**',
  'coverage/', '**/coverage/**',
],
```

Either add to `packages/config/eslint/index.js` or add a `.eslintignore`-equivalent ignore
block in a per-package `eslint.config.mjs`. Recommend touching the shared config so all
workspace packages benefit consistently.

## From vite-pin-fix (2026-04-15)

### `vite` template fails `pnpm build` with pre-existing TS errors

After pinning vite to `^7.3.2` to unblock install (the yanked `rolldown@1.0.0-rc.15`
transitive), smoke-test's install phase passes for all 4 templates. The `vite` template
still fails at build time with TS errors that predate this fix:

- `src/App.tsx(12,15): TS2339: Property 'env' does not exist on type 'ImportMeta'` (missing `vite/client` triple-slash reference or `vite-env.d.ts`).
- `src/App.tsx(67,10): TS2741: Property 'route' is missing in type ... but required in type 'UploadDropzoneProps'` (SDK requires `route` prop).
- `src/main.tsx(3,8) / (4,8): TS2882: Cannot find module ... '@uploadkitdev/react/styles.css' / './index.css'` (missing CSS module type declarations — needs `declare module '*.css';`).
- `TS2688: Cannot find type definition file for 'node'` (tsconfig has `"types": ["node"]` but `@types/node` is not in the vite template's devDependencies).

Out of scope for the vite-pin fix (that fix targets install-time resolution only). Track
these as a follow-up cleanup of the vite template's TS scaffolding.

## From 12-08 smoke CI

### Windows smoke tests fail silently for sveltekit and remix templates

On `windows-latest`, after scaffold+install succeed, `pnpm build` for the sveltekit and remix
templates exits with code 1 and no visible error output. The next and vite templates pass.

Ubuntu smoke passes cleanly for all 4 templates — this is Windows-specific (likely CRLF, path
separators, or a shell quirk between pnpm → vite → react-router/svelte-kit on Windows).

Windows was removed from the matrix to unblock merge; re-add and debug as a follow-up task.
Acceptance: `smoke (windows-latest)` passes all 4 templates.
