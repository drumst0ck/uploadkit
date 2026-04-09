import { defineConfig, devices } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/user.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    storageState: STORAGE_STATE,
  },
  projects: [
    // Setup project: authenticates once and saves storage state
    {
      name: 'setup',
      testMatch: /e2e\/helpers\/storage-state\.ts/,
    },
    // Main test project: depends on setup, reuses auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm --filter @uploadkit/dashboard dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
