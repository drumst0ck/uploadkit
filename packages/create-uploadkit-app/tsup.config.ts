import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // ESM only — `bin` in package.json points at `dist/index.js` and the package
  // is `"type": "module"`. A CJS build would be unused and triggers an
  // `import.meta` warning since the source legitimately uses `import.meta.url`.
  format: ['esm'],
  target: 'node20',
  clean: true,
  dts: false,
  splitting: false,
  shims: false,
  banner: { js: '#!/usr/bin/env node' },
});
