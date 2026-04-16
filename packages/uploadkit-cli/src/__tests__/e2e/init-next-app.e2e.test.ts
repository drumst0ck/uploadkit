import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

  it('supports Next.js src/app layout — writes route under src/app/api/uploadkit', async () => {
    fx = scaffold('next-app-src');
    const { root } = fx;

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Route handler lives under src/app — NOT app/ — because the project
    // uses the `src/` layout.
    const srcRoute = join(root, 'src', 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    expect(existsSync(srcRoute)).toBe(true);
    expect(existsSync(join(root, 'app'))).toBe(false);

    // Layout wrapped in place.
    const layoutSrc = readFileSync(join(root, 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layoutSrc).toContain('UploadKitProvider');
    expect(layoutSrc).toContain("from '@uploadkitdev/react'");

    // Client stub lives under src/lib to match the project layout.
    expect(existsSync(join(root, 'src', 'lib', 'uploadkit.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib', 'uploadkit.ts'))).toBe(false);
  });

  it('leaves no empty backup dir when preconditions fail', async () => {
    // Hand-built fixture: a package.json that declares `next` but has NO
    // layout anywhere. `uploadkit init` must abort with a non-zero exit
    // and must NOT create an empty `.uploadkit-backup/<ts>/` directory.
    const root = mkdtempSync(join(tmpdir(), 'uploadkit-malformed-'));
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'malformed',
          private: true,
          version: '0.0.0',
          dependencies: { next: '16.0.0', react: '19.0.0', 'react-dom': '19.0.0' },
        }),
        'utf8',
      );
      // Create an empty `app/` dir so the detector still identifies the
      // project as `next-app` (it probes for dir existence) — but without a
      // `layout.tsx` inside, the init flow must refuse.
      await mkdir(join(root, 'app'), { recursive: true });

      const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
      expect(res.exitCode).not.toBe(0);

      // No empty backup dir should have been created.
      const backupRoot = join(root, '.uploadkit-backup');
      expect(existsSync(backupRoot)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      // Swallow — tmpdir is reclaimed by OS regardless.
      void dirname;
    }
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

  it('detects create-uploadkit-app project (no markers) as already configured', async () => {
    fx = scaffold('next-app-preconfigured');
    const { root } = fx;

    // .env.local is gitignored so can't live in the fixture — create it here.
    const envPath = join(root, '.env.local');
    writeFileSync(envPath, 'UPLOADKIT_API_KEY=uk_test_placeholder\n', 'utf8');

    // Snapshot all file contents BEFORE running init.
    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const before = {
      layout: readFileSync(layoutPath, 'utf8'),
      route: readFileSync(routePath, 'utf8'),
      env: readFileSync(envPath, 'utf8'),
    };

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Should report "already configured".
    const out = `${res.stdout}\n${res.stderr}`;
    expect(out).toMatch(/already configured/i);

    // Zero file changes — contents must be identical.
    expect(readFileSync(layoutPath, 'utf8')).toBe(before.layout);
    expect(readFileSync(routePath, 'utf8')).toBe(before.route);
    expect(readFileSync(envPath, 'utf8')).toBe(before.env);

    // No backup dir created since nothing was modified.
    expect(existsSync(join(root, '.uploadkit-backup'))).toBe(false);
  });

  it('partial config: has route handler but no provider — only adds provider', async () => {
    fx = scaffold('next-app-partial');
    const { root } = fx;

    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const routeBefore = readFileSync(routePath, 'utf8');

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Route handler must NOT have been overwritten or recreated.
    expect(readFileSync(routePath, 'utf8')).toBe(routeBefore);

    // Layout SHOULD now have the provider.
    const layoutSrc = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8');
    expect(layoutSrc).toContain("from '@uploadkitdev/react'");
    expect(layoutSrc).toContain('UploadKitProvider');

    // .env.local SHOULD have been created (didn't exist in partial fixture).
    expect(existsSync(join(root, '.env.local'))).toBe(true);
    expect(readFileSync(join(root, '.env.local'), 'utf8')).toContain(
      'UPLOADKIT_API_KEY=uk_test_placeholder',
    );
  });
});
