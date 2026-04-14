import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: true,
  shims: true,
  banner: { js: '#!/usr/bin/env node' },
  // @uploadkitdev/mcp-core is a private workspace package — bundle it into
  // the published dist so consumers (npx users) never need to resolve it
  // from npm, where it does not exist.
  noExternal: ['@uploadkitdev/mcp-core'],
});
