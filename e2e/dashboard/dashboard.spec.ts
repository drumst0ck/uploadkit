import { test, expect } from '@playwright/test';

// Dashboard navigation structure smoke tests.
// Focuses on sidebar rendering and top-level navigation — not CRUD operations
// (those are covered by e2e/dashboard/crud.spec.ts).

test.describe('Dashboard navigation', () => {
  test('sidebar navigation items are visible', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for sidebar nav links: Overview/Dashboard
    await expect(
      page.getByRole('link', { name: /overview|dashboard/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('usage nav link is visible', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('link', { name: /usage/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('billing nav link is visible', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('link', { name: /billing/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('settings nav link is visible', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('link', { name: /settings/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('navigates to projects page', async ({ page }) => {
    await page.goto('/dashboard/projects');

    // Projects page should render without error
    await expect(page).toHaveURL(/\/dashboard\/projects/);

    // Should have a heading or content
    await expect(
      page.locator('h1, h2').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"New project" button is visible on projects page', async ({ page }) => {
    await page.goto('/dashboard/projects');

    const newProjectButton = page
      .getByRole('button', { name: /new project/i })
      .or(page.getByRole('link', { name: /new project/i }));

    await expect(newProjectButton.first()).toBeVisible({ timeout: 10_000 });
  });
});
