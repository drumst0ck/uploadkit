import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, scaffold, type Scaffolded } from '../helpers/scaffold.js';

/**
 * End-to-end test for `uploadkit init` against the Next.js App Router fixture.
 * Uses the COMPILED bin (dist/index.js) to exercise the exact path `npx
 * uploadkit init` takes in a real user project. `--skip-install` keeps the
 * run offline so CI doesn't need network or a real package manager.
 */
describe.sequential('e2e: uploadkit init (next-app)', () => {
  let fx: Scaffolded | null = null;

  afterEach(() => {
    fx?.cleanup();
    fx = null;
  });

  it('creates route handler, wraps layout, writes .env.local, records backup', async () => {
    fx = scaffold('next-app');
    const { root } = fx;

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Route handler created at the canonical D-05 path.
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    expect(existsSync(routePath)).toBe(true);
    const routeSrc = readFileSync(routePath, 'utf8');
    expect(routeSrc).toContain('createUploadKitHandler');
    expect(routeSrc).toContain('@uploadkitdev/next');
    expect(routeSrc).toContain('uploadkit:start');

    // Client stub created.
    const clientPath = join(root, 'lib', 'uploadkit.ts');
    expect(existsSync(clientPath)).toBe(true);

    // Layout wrapped with provider, import present, structure preserved.
    const layoutSrc = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8');
    expect(layoutSrc).toContain("from '@uploadkitdev/react'");
    expect(layoutSrc).toContain('UploadKitProvider');
    expect(layoutSrc).toContain('uploadkit:start');
    const bodyOpen = layoutSrc.indexOf('<body');
    const providerOpen = layoutSrc.indexOf('<UploadKitProvider');
    const childrenRef = layoutSrc.indexOf('{children}');
    expect(bodyOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(childrenRef);
    // Original user code preserved — the provider wraps, never replaces.
    expect(layoutSrc).toContain('inter.className');

    // .env.local written with placeholder key.
    const envPath = join(root, '.env.local');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain(
      'UPLOADKIT_API_KEY=uk_test_placeholder',
    );

    // Backup dir created and gitignored.
    expect(existsSync(join(root, '.uploadkit-backup'))).toBe(true);
    const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.uploadkit-backup');
  });

  it('second run is idempotent — "already configured" + zero file changes', async () => {
    fx = scaffold('next-app');
    const { root } = fx;

    const first = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(first.exitCode, `stderr:\n${first.stderr}`).toBe(0);

    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const envPath = join(root, '.env.local');
    const before = {
      layout: statSync(layoutPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    // Sleep long enough that any write would bump mtime past fs granularity.
    await new Promise((r) => setTimeout(r, 50));

    const second = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(second.exitCode, `stderr:\n${second.stderr}`).toBe(0);
    // Output channel is whichever stream the CLI chose — accept both.
    const out = `${second.stdout}\n${second.stderr}`;
    expect(out).toMatch(/already configured/i);

    const after = {
      layout: statSync(layoutPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
  });
});
