import { test, expect } from '@playwright/test';

test.describe('GitHub OAuth (AUTH-01)', () => {
  // GitHub OAuth requires a live provider — gate on env vars for manual / CI runs
  // that have real GitHub test credentials configured.
  //
  // To run this test:
  //   GITHUB_TEST_EMAIL=your@email.com GITHUB_TEST_PASSWORD=xxx npx playwright test e2e/auth/github.spec.ts
  const hasGitHubCredentials = !!process.env.GITHUB_TEST_EMAIL;

  test('GitHub OAuth login redirects to /dashboard', async ({ page }) => {
    if (!hasGitHubCredentials) {
      test.skip(
        true,
        'Requires live GitHub OAuth — set GITHUB_TEST_EMAIL and GITHUB_TEST_PASSWORD to run'
      );
    }

    // Navigate to login page (no stored auth state for this test)
    await page.goto('/login');

    // Click the GitHub sign-in button
    await page.click('button:has-text("GitHub"), a:has-text("GitHub")');

    // GitHub OAuth redirect — fill in credentials on github.com
    await page.waitForURL(/github\.com\/login/, { timeout: 15_000 });
    await page.fill('#login_field', process.env.GITHUB_TEST_EMAIL!);
    await page.fill('#password', process.env.GITHUB_TEST_PASSWORD ?? '');
    await page.click('input[type="submit"]');

    // After successful OAuth, Auth.js redirects back and then to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
