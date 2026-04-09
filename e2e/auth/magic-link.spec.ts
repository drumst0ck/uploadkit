import { test, expect } from '@playwright/test';

test.describe('Email magic link (AUTH-03)', () => {
  // Magic link tests require the Auth.js-generated URL from the dev server console.
  // In dev mode, Auth.js logs: "Sending verification token to <email>: <url>"
  //
  // To run this test:
  //   E2E_MAGIC_LINK_URL=http://localhost:3001/api/auth/callback/email?... npx playwright test e2e/auth/magic-link.spec.ts

  test('magic link email form submits successfully', async ({ page }) => {
    await page.goto('/login');

    // Fill the email input and submit the magic link form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // After submitting, Auth.js shows a check-your-email page
    // Look for either a success message or redirection away from login
    await expect(
      page.getByText(/check your email|magic link|verification/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('magic link URL completes sign-in and redirects to /dashboard', async ({ page }) => {
    if (!process.env.E2E_MAGIC_LINK_URL) {
      test.skip(
        true,
        'Set E2E_MAGIC_LINK_URL to the magic link logged by Auth.js in dev mode to run this test'
      );
    }

    // Navigate directly to the magic link URL (simulates clicking the email link)
    await page.goto(process.env.E2E_MAGIC_LINK_URL!);

    // Auth.js processes the token and redirects to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
