import { test, expect } from '@playwright/test';

// Tests the /login page renders for unauthenticated users.
// These tests intentionally do NOT use storage state — they test the pre-auth UI.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');

    // The login page should have a heading or title
    await expect(
      page.getByRole('heading', { name: /sign in|log in|welcome|uploadkit/i }).or(
        page.locator('h1, h2').first()
      )
    ).toBeVisible({ timeout: 10_000 });
  });

  test('OAuth buttons are visible', async ({ page }) => {
    await page.goto('/login');

    // At least one OAuth provider button should be visible (GitHub or Google)
    const oauthButton = page
      .getByRole('button', { name: /github|google|continue with/i })
      .or(page.getByRole('link', { name: /github|google/i }));

    await expect(oauthButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test('magic link input is visible', async ({ page }) => {
    await page.goto('/login');

    // Email input for magic link auth
    const emailInput = page
      .getByRole('textbox', { name: /email/i })
      .or(page.locator('input[type="email"]'));

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });
});
