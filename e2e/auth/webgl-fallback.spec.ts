import { test, expect, type Browser } from '@playwright/test';

// The login backdrop is a WebGL shader. Browsers without WebGL must still get
// a working login page with a static backdrop instead of the error screen.
// Each case launches its own Chromium because WebGL is a launch-time flag.

const NO_WEBGL = ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];
const SOFTWARE_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function openLogin(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  return { page, errors };
}

test('login without WebGL shows the static backdrop and keeps the form usable', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: NO_WEBGL });
  try {
    const { page, errors } = await openLogin(browser, baseURL);

    expect(await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'))).toBe(false);
    await expect(page.locator('[data-webgl-fallback="dark-veil"]')).toHaveCount(1);
    await expect(page.locator('main canvas')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('login with WebGL keeps the animated canvas backdrop', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: SOFTWARE_WEBGL });
  try {
    const { page, errors } = await openLogin(browser, baseURL);

    await expect(page.locator('main canvas')).toHaveCount(1);
    await expect(page.locator('[data-webgl-fallback]')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
