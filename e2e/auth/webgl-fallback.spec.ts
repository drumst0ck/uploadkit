import { test, expect } from '@playwright/test';

// The login page must work in browsers without WebGL. It has no WebGL
// background any more, so it should render the form and draw no canvas.
// WebGL is a launch-time flag, so the test launches its own Chromium.

const NO_WEBGL = ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];

test('login without WebGL renders the form with no canvas and no errors', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: NO_WEBGL });
  try {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');

    expect(await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'))).toBe(false);
    await expect(page.locator('main canvas')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
