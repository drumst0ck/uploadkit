import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, scaffold, type Scaffolded } from '../helpers/scaffold.js';

/**
 * E2e for `uploadkit init` on a Vite + React fixture. No server in this
 * framework: there's no route handler, but the provider is still mounted
 * around <App /> and a Vite-prefixed env var is scaffolded (D-05).
 */
describe.sequential('e2e: uploadkit init (vite-react)', () => {
  let fx: Scaffolded | null = null;

  afterEach(() => {
    fx?.cleanup();
    fx = null;
  });

  it('wraps <App /> in main.tsx, adds import, writes VITE_-prefixed .env, warns', async () => {
    fx = scaffold('vite-react');
    const { root } = fx;

    const res = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(res.exitCode, `stderr:\n${res.stderr}`).toBe(0);

    // Provider mounted; StrictMode preserved as outer wrapper.
    const mainSrc = readFileSync(join(root, 'src', 'main.tsx'), 'utf8');
    expect(mainSrc).toContain('@uploadkitdev/react');
    expect(mainSrc).toContain('UploadKitProvider');
    expect(mainSrc).toContain('uploadkit:start');
    const strictOpen = mainSrc.indexOf('<StrictMode');
    const providerOpen = mainSrc.indexOf('<UploadKitProvider');
    const appRef = mainSrc.indexOf('<App');
    expect(strictOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(appRef);

    // Vite-prefixed env (client-side exposure — no server to hide it behind).
    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain(
      'VITE_UPLOADKIT_API_KEY=uk_test_placeholder',
    );

    // Warning about serverless/BYOS appears on stderr.
    expect(res.stderr.toLowerCase()).toMatch(/vite/);
    expect(res.stderr.toLowerCase()).toMatch(/backend|server|byos/);
  });

  it('second run is idempotent', async () => {
    fx = scaffold('vite-react');
    const { root } = fx;

    const first = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(first.exitCode, `stderr:\n${first.stderr}`).toBe(0);

    const mainPath = join(root, 'src', 'main.tsx');
    const envPath = join(root, '.env');
    const before = {
      main: statSync(mainPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    await new Promise((r) => setTimeout(r, 50));

    const second = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(second.exitCode, `stderr:\n${second.stderr}`).toBe(0);
    expect(`${second.stdout}\n${second.stderr}`).toMatch(/already configured/i);

    const after = {
      main: statSync(mainPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
  });
});
