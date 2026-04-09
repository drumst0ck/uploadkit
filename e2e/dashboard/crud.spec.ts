import { test, expect } from '@playwright/test';

// Dashboard CRUD tests run against the dashboard app (baseURL: http://localhost:3001).
// They require an authenticated session — see e2e/helpers/storage-state.ts.
// Tests follow the dashboard route structure:
//   /dashboard                       — overview
//   /dashboard/projects              — project list
//   /dashboard/projects/[slug]       — project overview
//   /dashboard/projects/[slug]/keys  — API keys
//   /dashboard/projects/[slug]/logs  — upload logs
//   /dashboard/usage                 — usage charts

test.describe('Dashboard CRUD', () => {
  test('creates a new project', async ({ page }) => {
    await page.goto('/dashboard');

    // Click "New Project" button (text may vary slightly by implementation)
    const newProjectButton = page.getByRole('button', { name: /new project/i }).or(
      page.getByRole('link', { name: /new project/i })
    );
    await expect(newProjectButton).toBeVisible({ timeout: 10_000 });
    await newProjectButton.click();

    // Fill in the project name in the dialog/form
    const nameInput = page.getByPlaceholder(/project name|name/i).or(
      page.locator('input[name="name"]')
    );
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill('E2E Test Project');

    // Submit the form
    await page.getByRole('button', { name: /create|submit|save/i }).click();

    // Verify the project appears in the list or sidebar
    await expect(
      page.getByText('E2E Test Project', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('generates an API key for a project', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to first project's API keys page
    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });

    // Extract slug from href to build the keys URL
    const href = await projectLink.getAttribute('href');
    const keysUrl = href ? `${href.replace(/\/$/, '')}/keys` : '/dashboard';
    await page.goto(keysUrl);

    // Click create/generate key button
    const createKeyButton = page.getByRole('button', { name: /create|generate|add.*key/i });
    await expect(createKeyButton).toBeVisible({ timeout: 10_000 });
    await createKeyButton.click();

    // The generated key should appear in masked form (uk_live_xxx...xxx)
    await expect(
      page.getByText(/uk_live_|uk_test_/, { exact: false })
    ).toBeVisible({ timeout: 10_000 });

    // A copy button should be present next to the key
    const copyButton = page.getByRole('button', { name: /copy/i });
    await expect(copyButton).toBeVisible({ timeout: 5_000 });
  });

  test('views upload logs page', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to first project's logs page
    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });

    const href = await projectLink.getAttribute('href');
    const logsUrl = href ? `${href.replace(/\/$/, '')}/logs` : '/dashboard';
    await page.goto(logsUrl);

    // Logs page should show table headers: timestamp, status, file, route
    // Even if empty, the column headings should render
    await expect(
      page.getByText(/timestamp|date|time/i)
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/status/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('views usage page with charts', async ({ page }) => {
    await page.goto('/dashboard/usage');

    // Usage page should render progress bars or chart containers
    // Look for recharts containers or storage/bandwidth progress bars
    await expect(
      page.locator(
        '[class*="chart"], [class*="recharts"], [role="progressbar"], ' +
        '[class*="progress"], [class*="usage"]'
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a project', async ({ page }) => {
    // Create a disposable project first, then delete it
    await page.goto('/dashboard');

    // Create project to delete
    const newProjectButton = page.getByRole('button', { name: /new project/i }).or(
      page.getByRole('link', { name: /new project/i })
    );
    if (await newProjectButton.isVisible({ timeout: 5_000 })) {
      await newProjectButton.click();

      const nameInput = page.getByPlaceholder(/project name|name/i).or(
        page.locator('input[name="name"]')
      );
      if (await nameInput.isVisible({ timeout: 3_000 })) {
        await nameInput.fill('E2E Delete Project');
        await page.getByRole('button', { name: /create|submit|save/i }).click();
        await expect(
          page.getByText('E2E Delete Project', { exact: false })
        ).toBeVisible({ timeout: 10_000 });
      }
    }

    // Navigate to the project settings
    const projectLink = page
      .locator('a[href*="/dashboard/projects/"]', { hasText: /E2E Delete Project/i })
      .or(page.locator('a[href*="/dashboard/projects/"]').first());

    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    const href = await projectLink.getAttribute('href');
    const settingsUrl = href ? `${href.replace(/\/$/, '')}/settings` : '/dashboard';
    await page.goto(settingsUrl);

    // Click delete project button
    const deleteButton = page.getByRole('button', { name: /delete project|delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // Confirm deletion dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 3_000 })) {
      await confirmButton.click();
    }

    // After deletion, redirected back to /dashboard overview
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
