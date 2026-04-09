import { test, expect } from '@playwright/test';

// Billing page smoke tests — FREE tier display only.
// Does not test Stripe checkout redirect (covered by e2e/billing/checkout.spec.ts).

test.describe('Billing page — FREE tier display', () => {
  test('"Current Plan" card is visible', async ({ page }) => {
    await page.goto('/dashboard/billing');

    await expect(
      page.getByText(/current plan/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('plan name is displayed', async ({ page }) => {
    await page.goto('/dashboard/billing');

    // Should show a tier name: Free, Pro, Team, or Enterprise
    await expect(
      page.getByText(/free|pro|team|enterprise/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('upgrade buttons are visible for FREE tier', async ({ page }) => {
    await page.goto('/dashboard/billing');

    // Upgrade CTA for Pro or Team plan should be visible
    const upgradeButton = page
      .getByRole('button', { name: /upgrade|get pro|get team|pro|team/i })
      .or(page.getByRole('link', { name: /upgrade|get pro|get team/i }));

    await expect(upgradeButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test('usage summary is visible on billing page', async ({ page }) => {
    await page.goto('/dashboard/billing');

    // Usage metrics (storage, bandwidth, or uploads) should appear on billing page
    await expect(
      page.getByText(/storage|bandwidth|upload/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
