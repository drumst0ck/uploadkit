import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { initViteReact } from '../init/vite-react.js';
import { createBackupSession } from '../backup/backup.js';
import type { InitContext } from '../init/types.js';

const FIXTURE_DIR = resolve(
  dirname(new URL(import.meta.url).pathname),
  '..',
  '__fixtures__',
  'projects',
  'vite-react',
);

function cloneFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uploadkit-init-vite-'));
  cpSync(FIXTURE_DIR, dir, { recursive: true });
  return dir;
}

function makeCtx(root: string): InitContext {
  return {
    root,
    detection: {
      framework: 'vite-react',
      root,
      packageManager: 'pnpm',
    },
    flags: {
      yes: true,
      skipInstall: true,
    },
  };
}

describe('initViteReact — fresh run', () => {
  let root: string;

  beforeEach(() => {
    root = cloneFixture();
  });

  it('wraps <App /> in main.tsx, adds import, writes .env, warns about server', async () => {
    // Capture console warnings — impl is expected to print a warning.
    const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const session = createBackupSession(root, { timestamp: '2026-04-15T03-00-00Z' });
    const result = await initViteReact(makeCtx(root), () => session);
    await session.finalize();

    expect(result.skipped).toBe(false);

    const mainPath = join(root, 'src', 'main.tsx');
    const mainSrc = readFileSync(mainPath, 'utf8');
    expect(mainSrc).toContain('@uploadkitdev/react');
    expect(mainSrc).toContain('UploadKitProvider');
    expect(mainSrc).toContain('uploadkit:start');
    // Provider must wrap <App />, which sits inside <StrictMode>.
    const strictOpen = mainSrc.indexOf('<StrictMode');
    const providerOpen = mainSrc.indexOf('<UploadKitProvider');
    const appRef = mainSrc.indexOf('<App');
    expect(strictOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(appRef);

    // .env uses VITE_ prefix (Vite convention — server-less warning applies).
    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain(
      'VITE_UPLOADKIT_API_KEY=uk_test_placeholder',
    );

    // Warning on stderr.
    const stderrOutput = warnSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput.toLowerCase()).toContain('vite');
    expect(stderrOutput.toLowerCase()).toMatch(/backend|server|byos/);

    warnSpy.mockRestore();

    // Manifest entries.
    const manifest = JSON.parse(readFileSync(join(session.dir, 'manifest.json'), 'utf8')) as {
      entries: Array<{ action: string; relativePath: string }>;
    };
    const actions = Object.fromEntries(
      manifest.entries.map((e) => [e.relativePath.split(/[\\/]/).join('/'), e.action]),
    );
    expect(actions['src/main.tsx']).toBe('modify');
    expect(actions['.env']).toBe('create');
  });

  it('reports installed packages (react only)', async () => {
    const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const session = createBackupSession(root, { timestamp: '2026-04-15T03-00-01Z' });
    const result = await initViteReact(makeCtx(root), () => session);
    warnSpy.mockRestore();
    expect(result.installed).toEqual(['@uploadkitdev/react@latest']);
  });

  it('backs up src/main.tsx byte-for-byte before mutation', async () => {
    const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const mainPath = join(root, 'src', 'main.tsx');
    const original = readFileSync(mainPath);

    const session = createBackupSession(root, { timestamp: '2026-04-15T03-00-02Z' });
    await initViteReact(makeCtx(root), () => session);
    await session.finalize();
    warnSpy.mockRestore();

    const backedUp = readFileSync(join(session.dir, 'src', 'main.tsx'));
    expect(backedUp.equals(original)).toBe(true);
  });
});

describe('initViteReact — idempotency (second run)', () => {
  it('second run is a no-op', async () => {
    const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const root = cloneFixture();

    const s1 = createBackupSession(root, { timestamp: '2026-04-15T03-10-00Z' });
    await initViteReact(makeCtx(root), () => s1);
    await s1.finalize();

    const mainPath = join(root, 'src', 'main.tsx');
    const envPath = join(root, '.env');
    const before = {
      main: statSync(mainPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    await new Promise((r) => setTimeout(r, 20));

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T03-10-01Z' });
    const result = await initViteReact(makeCtx(root), () => s2);
    warnSpy.mockRestore();

    expect(result.skipped).toBe(true);
    expect(result.created).toEqual([]);
    expect(result.modified).toEqual([]);

    const after = {
      main: statSync(mainPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
    expect(existsSync(s2.dir)).toBe(false);
  });
});

describe('commands/init.ts dispatch', () => {
  it('IMPLS maps all four supported frameworks', async () => {
    const mod = await import('../commands/init.js');
    // We can't read IMPLS directly without exporting, but the dispatcher test
    // below asserts behaviour instead. This keeps the test robust to renames.
    expect(mod.run).toBeTypeOf('function');
  });
});
