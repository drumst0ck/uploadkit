import type { Page } from '@playwright/test';
import path from 'path';

// Path where authenticated session state is saved.
// This file contains cookies/localStorage — must be gitignored (T-10-04).
export const STORAGE_STATE_PATH = path.join(
  process.cwd(),
  'e2e/.auth/user.json'
);

/**
 * Login helper using the email magic link flow.
 *
 * Magic link is the most CI-friendly auth path because:
 * - No external OAuth provider credentials required
 * - Auth.js logs the magic link URL to console in dev mode
 * - Set E2E_MAGIC_LINK_URL to the URL logged by Auth.js to complete the flow
 *
 * @param page - Playwright page object
 * @param email - Test email address to use (default: test@example.com)
 */
export async function login(page: Page, email = 'test@example.com'): Promise<void> {
  await page.goto('/login');

  // Fill in the email input and submit
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');

  // If a magic link URL is provided via env var, navigate to it directly
  const magicLinkUrl = process.env.E2E_MAGIC_LINK_URL;
  if (magicLinkUrl) {
    await page.goto(magicLinkUrl);
    // Wait for redirect to dashboard after successful auth
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
  }
  // Otherwise the helper just submits the form (no further navigation possible
  // without the magic link URL — tests gated on this env var will handle the skip)
}
