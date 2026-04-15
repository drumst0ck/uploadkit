import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, scaffold, type Scaffolded } from '../helpers/scaffold.js';

/**
 * E2e for `uploadkit init` on a SvelteKit fixture. Key difference vs Next: no
 * React provider is mounted; the layout file must remain untouched and a
 * typed client stub appears at `src/lib/uploadkit.ts` instead (D-05).
 */
describe.sequential('e2e: uploadkit init (sveltekit)', () => {
  let fx: Scaffolded | null = null;

  afterEach(() => {
    fx?.cleanup();
    fx = null;
  });

  it('creates +server.ts route, client stub, .env — leaves +layout.svelte alone', async () => {
    fx = scaffold('sveltekit');
    const { root } = fx;

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Route handler at the canonical SvelteKit path.
    const routePath = join(
      root,
      'src',
      'routes',
      'api',
      'uploadkit',
      '[...uploadkit]',
      '+server.ts',
    );
    expect(existsSync(routePath)).toBe(true);
    const routeSrc = readFileSync(routePath, 'utf8');
    expect(routeSrc).toContain('uploadkit:start');
    expect(routeSrc).toContain('RequestHandler');

    // Client stub wires @uploadkitdev/core (no React in Svelte-land).
    const clientPath = join(root, 'src', 'lib', 'uploadkit.ts');
    expect(existsSync(clientPath)).toBe(true);
    const clientSrc = readFileSync(clientPath, 'utf8');
    expect(clientSrc).toContain('createUploadKit');
    expect(clientSrc).toContain('@uploadkitdev/core');

    // Env file uses the un-prefixed key — SvelteKit exposes PUBLIC_ explicitly,
    // so secret keys stay un-prefixed and server-only.
    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain(
      'UPLOADKIT_API_KEY=uk_test_placeholder',
    );

    // Layout must NOT have been mutated — no React provider in Svelte.
    const layoutSrc = readFileSync(
      join(root, 'src', 'routes', '+layout.svelte'),
      'utf8',
    );
    expect(layoutSrc).not.toContain('UploadKit');
    expect(layoutSrc).not.toContain('uploadkit:start');
  });

  it('second run is idempotent', async () => {
    fx = scaffold('sveltekit');
    const { root } = fx;

    const first = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(first.exitCode, `stderr:\n${first.stderr}`).toBe(0);

    const routePath = join(
      root,
      'src',
      'routes',
      'api',
      'uploadkit',
      '[...uploadkit]',
      '+server.ts',
    );
    const clientPath = join(root, 'src', 'lib', 'uploadkit.ts');
    const envPath = join(root, '.env');

    const before = {
      route: statSync(routePath).mtimeMs,
      client: statSync(clientPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    await new Promise((r) => setTimeout(r, 50));

    const second = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(second.exitCode, `stderr:\n${second.stderr}`).toBe(0);
    expect(`${second.stdout}\n${second.stderr}`).toMatch(/already configured/i);

    const after = {
      route: statSync(routePath).mtimeMs,
      client: statSync(clientPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
  });
});
