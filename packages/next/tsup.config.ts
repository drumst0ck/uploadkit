import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

// Keep the client reference as a separate directive-bearing module. Inlining it
// into the server entry would execute React client hooks in an RSC import.
const clientBoundary: Plugin = {
  name: 'uploadkit-client-boundary',
  setup(build) {
    build.onResolve({ filter: /^\.\/helpers$/ }, ({ importer }) => {
      if (!importer.endsWith('/src/index.ts')) return;
      return { path: build.initialOptions.format === 'esm' ? './helpers.mjs' : './helpers.js', external: true };
    });
  },
};
const external = ['next', 'react', '@uploadkitdev/core', '@uploadkitdev/react/helpers',
  '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'server-only', 'express', 'fastify', 'hono'];

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/byos-entry.ts', 'src/ssr-plugin.tsx',
      'src/adapters/express.ts', 'src/adapters/fastify.ts', 'src/adapters/hono.ts'],
    format: ['esm', 'cjs'], dts: true, clean: false, external,
    esbuildPlugins: [clientBoundary],
  },
  {
    entry: ['src/helpers.ts', 'src/browser.ts'],
    format: ['esm', 'cjs'], dts: true, clean: false, external,
    banner: { js: '"use client";' },
  },
]);
