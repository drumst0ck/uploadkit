import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Workspace packages resolve to their sources so tests don't need a prior build.
const pkg = (name: string) => resolve(import.meta.dirname, `../../packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@uploadkitdev/shared': pkg('shared'),
      '@uploadkitdev/db': pkg('db'),
      '@uploadkitdev/emails': pkg('emails'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
