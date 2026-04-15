import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/__fixtures__/**'],
    // E2e tests spawn the compiled bin (`dist/index.js`). globalSetup
    // runs `pnpm build` iff dist is missing or stale, so `pnpm test` on
    // a fresh clone "just works" without a separate build step.
    globalSetup: ['./src/__tests__/helpers/global-setup.ts'],
    // Per-test default budget; e2e tests may bump their own with `testTimeout`
    // on individual `it()` calls. 30s covers child-process spawn + tmpdir IO.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
