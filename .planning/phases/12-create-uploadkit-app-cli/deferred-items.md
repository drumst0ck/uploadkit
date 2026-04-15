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
