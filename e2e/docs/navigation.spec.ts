import { test, expect } from '@playwright/test';

// Docs navigation tests run against the docs app (http://localhost:3003).
// These tests do NOT require authentication — docs are public.
//
// Routes follow Fumadocs conventions:
//   /docs                                        — docs homepage
//   /docs/getting-started/quickstart             — quickstart guide
//   /docs/sdk/core/installation                  — core SDK reference

const DOCS_BASE_URL = 'http://localhost:3003';

test.describe('Docs navigation', () => {
  test('docs homepage loads with search', async ({ page }) => {
    await page.goto(DOCS_BASE_URL + '/docs');

    // Docs homepage should show a main heading
    const heading = page
      .getByRole('heading', { level: 1 })
      .or(page.getByRole('heading').first());
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Fumadocs includes a search input (Cmd+K or visible search box)
    const searchInput = page
      .getByRole('button', { name: /search/i })
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator('[class*="search"]').first());
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('quickstart page is accessible from sidebar', async ({ page }) => {
    await page.goto(DOCS_BASE_URL + '/docs');

    // Click "Quickstart" in sidebar navigation
    const quickstartLink = page
      .getByRole('link', { name: /quickstart/i })
      .or(page.locator('nav a', { hasText: /quickstart/i }))
      .first();
    await expect(quickstartLink).toBeVisible({ timeout: 10_000 });
    await quickstartLink.click();

    // Quickstart page should have installation instructions
    await expect(
      page.getByText(/pnpm add|npm install|installation/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('SDK reference pages load', async ({ page }) => {
    // Navigate directly to the core SDK installation page
    await page.goto(DOCS_BASE_URL + '/docs/sdk/core/installation');

    // The page should render SDK reference content including createUploadKit
    await expect(
      page.getByText(/createUploadKit|@uploadkit\/core/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
