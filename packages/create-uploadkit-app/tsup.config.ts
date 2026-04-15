import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node20',
  clean: true,
  dts: false,
  splitting: false,
  shims: false,
  banner: ({ format }) => (format === 'esm' ? { js: '#!/usr/bin/env node' } : {}),
});
