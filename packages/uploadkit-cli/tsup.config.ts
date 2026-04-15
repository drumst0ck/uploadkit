import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'tsup';

/**
 * Templates (`src/init/templates/*.tpl`) are read at runtime by `initNextApp`
 * relative to the compiled module. tsup compiles `src/index.ts` but doesn't
 * copy arbitrary file extensions — we mirror the templates dir into dist
 * after each build so the published bin works when installed from npm.
 */
const TEMPLATE_SRC = resolve('src/init/templates');
const TEMPLATE_DEST = resolve('dist/templates');
const ADD_TEMPLATE_SRC = resolve('src/add/templates');
const ADD_TEMPLATE_DEST = resolve('dist/add-templates');

export default defineConfig({
  entry: ['src/index.ts'],
  // ESM only — `bin` in package.json points at `dist/index.js` and the package
  // is `"type": "module"`. Source uses `import.meta.url`, so CJS would warn.
  format: ['esm'],
  target: 'node20',
  clean: true,
  dts: false,
  splitting: false,
  shims: false,
  banner: { js: '#!/usr/bin/env node' },
  onSuccess: async () => {
    mkdirSync(dirname(TEMPLATE_DEST), { recursive: true });
    cpSync(TEMPLATE_SRC, TEMPLATE_DEST, { recursive: true });
    mkdirSync(dirname(ADD_TEMPLATE_DEST), { recursive: true });
    cpSync(ADD_TEMPLATE_SRC, ADD_TEMPLATE_DEST, { recursive: true });
  },
});
