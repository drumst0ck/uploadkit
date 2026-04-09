import { test, expect } from '@playwright/test';

// Billing E2E tests run against the dashboard app (baseURL: http://localhost:3001).
// They require an authenticated session — see e2e/helpers/storage-state.ts.
//
// Stripe checkout tests require test-mode Stripe keys.
// The checkout redirect test is skipped when STRIPE_SECRET_KEY is not set.
// Per T-10-05: tests only check redirect URL patterns, never log or assert on
// actual secret key values.

test.describe('Billing', () => {
  test('billing page shows current plan', async ({ page }) => {
    await page.goto('/dashboard/billing');

    // The default plan for a new test user is "Free"
    // The billing page should display the current plan prominently
    await expect(
      page.getByText(/free|current plan/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('upgrade button links to Stripe Checkout', async ({ page }) => {
    // Skip if no Stripe secret key — cannot create checkout session without it
    if (!process.env.STRIPE_SECRET_KEY) {
      test.skip(
        true,
        'Set STRIPE_SECRET_KEY (test mode) to run Stripe Checkout E2E test'
      );
    }

    await page.goto('/dashboard/billing');

    // Click the upgrade/pro button
    const upgradeButton = page.getByRole('button', { name: /upgrade|pro|subscribe/i }).or(
      page.getByRole('link', { name: /upgrade|pro|subscribe/i })
    );
    await expect(upgradeButton).toBeVisible({ timeout: 10_000 });

    // Listen for navigation — Stripe Checkout redirects to checkout.stripe.com
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15_000 }).catch(() => null),
      upgradeButton.click(),
    ]);

    // Verify redirect goes to Stripe Checkout (URL or iframe)
    const currentUrl = page.url();
    const isStripeCheckout =
      currentUrl.includes('checkout.stripe.com') ||
      currentUrl.includes('billing.stripe.com') ||
      // Some implementations show Stripe in an iframe on the same page
      (await page.locator('iframe[src*="stripe.com"]').isVisible());

    expect(isStripeCheckout).toBeTruthy();
  });
});
