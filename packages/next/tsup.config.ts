import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
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
  ],
});
