import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // `server-only` is a Next.js build-time guard; stub it for vitest.
      'server-only': resolve(__dirname, '__tests__/stubs/server-only.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts'],
  },
});
