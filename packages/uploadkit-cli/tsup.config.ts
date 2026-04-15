import { defineConfig } from 'tsup';

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
});
