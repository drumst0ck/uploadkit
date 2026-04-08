import { test } from '@playwright/test';

test.describe('Email magic link (AUTH-03)', () => {
  test.skip('Magic link email triggers sign-in and redirects to /dashboard', async () => {
    // Requires Resend API key and verified domain. Run manually via Task 3 checkpoint.
    // In dev: Auth.js logs magic link URL to console — can be used for automated test.
  });
});
