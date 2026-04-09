import { test, expect } from '@playwright/test';
import path from 'path';

// These tests run against the dashboard app (baseURL: http://localhost:3001).
// They require an authenticated session — see e2e/helpers/storage-state.ts.
// A test fixture file is uploaded and then cleaned up within the test suite.

test.describe('Upload flow', () => {
  // Navigate to the dashboard and then to the first available project
  test('navigates to a project and sees upload area', async ({ page }) => {
    await page.goto('/dashboard');

    // Click the first project card or sidebar link to open a project
    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    await projectLink.click();

    // Navigate to the files sub-page
    await page.waitForURL('**/dashboard/projects/**');

    // The files page shows an upload dropzone or file input area
    const filesLink = page.getByRole('link', { name: /files/i });
    if (await filesLink.isVisible()) {
      await filesLink.click();
    }

    // Verify that some upload affordance is visible
    await expect(
      page.locator('input[type="file"], [data-testid="upload-area"], [class*="dropzone"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('uploads a single file via the dashboard UI', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to first project files page
    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    await projectLink.click();
    await page.waitForURL('**/dashboard/projects/**');

    const filesLink = page.getByRole('link', { name: /files/i });
    if (await filesLink.isVisible()) {
      await filesLink.click();
    }

    // Use setInputFiles to upload a small test file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10_000 });

    // Create a minimal test file buffer
    await fileInput.setInputFiles({
      name: 'e2e-test-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('E2E test file content for UploadKit'),
    });

    // Wait for upload progress indicator to appear and resolve
    await expect(
      page.locator('[role="progressbar"], [data-testid="upload-progress"], [class*="progress"]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('uploaded file shows correct name in file browser', async ({ page }) => {
    await page.goto('/dashboard');

    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    await projectLink.click();
    await page.waitForURL('**/dashboard/projects/**');

    const filesLink = page.getByRole('link', { name: /files/i });
    if (await filesLink.isVisible()) {
      await filesLink.click();
    }

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10_000 });

    await fileInput.setInputFiles({
      name: 'e2e-verify-name.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('E2E file name verification'),
    });

    // After upload, the file table should show the file name
    await expect(
      page.getByText('e2e-verify-name.txt', { exact: false })
    ).toBeVisible({ timeout: 20_000 });
  });

  test('deletes an uploaded file from the file browser', async ({ page }) => {
    await page.goto('/dashboard');

    const projectLink = page.locator('a[href*="/dashboard/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    await projectLink.click();
    await page.waitForURL('**/dashboard/projects/**');

    const filesLink = page.getByRole('link', { name: /files/i });
    if (await filesLink.isVisible()) {
      await filesLink.click();
    }

    // Upload a file first so there is something to delete
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10_000 });
    await fileInput.setInputFiles({
      name: 'e2e-delete-me.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Delete this file'),
    });

    // Wait for the file to appear in the table
    await expect(
      page.getByText('e2e-delete-me.txt', { exact: false })
    ).toBeVisible({ timeout: 20_000 });

    // Click the delete/actions button for this file
    const deleteButton = page
      .locator('tr', { hasText: 'e2e-delete-me.txt' })
      .getByRole('button', { name: /delete|remove/i });

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion dialog if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify the file is removed from the table
      await expect(
        page.getByText('e2e-delete-me.txt', { exact: false })
      ).not.toBeVisible({ timeout: 10_000 });
    }
  });
});
