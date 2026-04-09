import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Exclude @uploadkitdev/react tests — they require jsdom and run via packages/react/vitest.config.ts
    include: ['packages/*/tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    exclude: ['packages/react/tests/**', '**/node_modules/**'],
  },
});
