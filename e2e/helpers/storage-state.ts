/**
 * Playwright setup file — runs once before all tests in the 'setup' project.
 *
 * Purpose: Authenticate a test user and save the browser storage state
 * (cookies, localStorage) to e2e/.auth/user.json. All subsequent tests
 * reuse this state so they start pre-authenticated without re-logging in.
 *
 * Storage state file contains session cookies and must not be committed
 * to version control (T-10-04). It is listed in .gitignore.
 *
 * To run authenticated E2E tests:
 * 1. Start the dashboard dev server: pnpm --filter @uploadkit/dashboard dev
 * 2. Get the magic link URL from the Auth.js console output
 * 3. Set E2E_MAGIC_LINK_URL=<url> in your environment
 * 4. Run: npx playwright test
 */

import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login, STORAGE_STATE_PATH } from './auth';

setup('authenticate', async ({ page }) => {
  // Ensure the .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (!process.env.E2E_MAGIC_LINK_URL) {
    // No magic link URL provided — create an empty storage state so the
    // setup project completes without error. Tests that need auth will
    // either skip themselves or fail gracefully if they check for auth.
    fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
    console.warn(
      '[E2E Setup] No E2E_MAGIC_LINK_URL set — skipping authentication.\n' +
      'Tests requiring auth state will run without a session.\n' +
      'To authenticate: set E2E_MAGIC_LINK_URL to the magic link logged by Auth.js in dev mode.'
    );
    return;
  }

  // Perform login via magic link and save the resulting session state
  await login(page, process.env.E2E_TEST_EMAIL ?? 'test@example.com');
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
