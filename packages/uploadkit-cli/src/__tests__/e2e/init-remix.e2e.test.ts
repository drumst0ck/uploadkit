import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, scaffold, type Scaffolded } from '../helpers/scaffold.js';

/**
 * E2e for `uploadkit init` on the Remix / React Router 7 fixture. Verifies the
 * api.uploadkit.$ route file, provider wrapping inside <body> around <Outlet/>,
 * and .env scaffold per D-05.
 */
describe.sequential('e2e: uploadkit init (remix)', () => {
  let fx: Scaffolded | null = null;

  afterEach(() => {
    fx?.cleanup();
    fx = null;
  });

  it('creates api.uploadkit.$.tsx, wraps root.tsx body, writes .env', async () => {
    fx = scaffold('remix');
    const { root } = fx;

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    const routePath = join(root, 'app', 'routes', 'api.uploadkit.$.tsx');
    expect(existsSync(routePath)).toBe(true);
    const routeSrc = readFileSync(routePath, 'utf8');
    expect(routeSrc).toContain('uploadkit:start');
    expect(routeSrc).toMatch(/export\s+(async\s+)?function\s+action/);
    expect(routeSrc).toMatch(/export\s+(async\s+)?function\s+loader/);

    const rootSrc = readFileSync(join(root, 'app', 'root.tsx'), 'utf8');
    expect(rootSrc).toContain('@uploadkitdev/react');
    expect(rootSrc).toContain('<UploadKitProvider');
    expect(rootSrc).toContain('uploadkit:start');
    const bodyOpen = rootSrc.indexOf('<body');
    const providerOpen = rootSrc.indexOf('<UploadKitProvider');
    const outletRef = rootSrc.indexOf('<Outlet');
    expect(bodyOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(outletRef);

    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain(
      'UPLOADKIT_API_KEY=uk_test_placeholder',
    );
  });

  it('second run is idempotent', async () => {
    fx = scaffold('remix');
    const { root } = fx;

    const first = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(first.exitCode, `stderr:\n${first.stderr}`).toBe(0);

    const rootPath = join(root, 'app', 'root.tsx');
    const routePath = join(root, 'app', 'routes', 'api.uploadkit.$.tsx');
    const envPath = join(root, '.env');
    const before = {
      root: statSync(rootPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    await new Promise((r) => setTimeout(r, 50));

    const second = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(second.exitCode, `stderr:\n${second.stderr}`).toBe(0);
    expect(`${second.stdout}\n${second.stderr}`).toMatch(/already configured/i);

    const after = {
      root: statSync(rootPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
  });
});
