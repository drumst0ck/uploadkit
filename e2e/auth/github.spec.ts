import { test } from '@playwright/test';

test.describe('GitHub OAuth (AUTH-01)', () => {
  test.skip('GitHub OAuth login creates user and redirects to /dashboard', async () => {
    // Requires live GitHub OAuth credentials. Run manually via Task 3 checkpoint.
    // Automated CI: use Playwright mock OAuth server when configured.
  });
});
