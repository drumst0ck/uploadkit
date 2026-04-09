import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/ssr-plugin.tsx',
    'src/adapters/express.ts',
    'src/adapters/fastify.ts',
    'src/adapters/hono.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: [
    'next',
    'react',
    '@uploadkit/core',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    'server-only',
    'express',
    'fastify',
    'hono',
  ],
});
