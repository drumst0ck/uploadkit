import { test } from '@playwright/test';

test.describe('Session persistence (AUTH-04)', () => {
  test.skip('Session survives browser context close and reopen', async () => {
    // Requires authenticated state. Run manually via Task 3 checkpoint.
  });
});
