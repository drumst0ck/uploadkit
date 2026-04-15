import { describe, it, expect, beforeEach } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { initNextApp } from '../init/next-app.js';
import { createBackupSession } from '../backup/backup.js';
import type { InitContext } from '../init/types.js';

const FIXTURE_DIR = resolve(
  dirname(new URL(import.meta.url).pathname),
  '..',
  '__fixtures__',
  'projects',
  'next-app',
);

function cloneFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uploadkit-init-next-'));
  cpSync(FIXTURE_DIR, dir, { recursive: true });
  return dir;
}

function makeCtx(root: string, overrides: Partial<InitContext['flags']> = {}): InitContext {
  return {
    root,
    detection: {
      framework: 'next-app',
      root,
      packageManager: 'pnpm',
    },
    flags: {
      yes: true,
      skipInstall: true,
      ...overrides,
    },
  };
}

describe('initNextApp — fresh run', () => {
  let root: string;

  beforeEach(() => {
    root = cloneFixture();
  });

  it('creates route handler, wraps layout, writes .env.local, records backup', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-00Z' });
    const result = await initNextApp(makeCtx(root), () => session);
    await session.finalize();

    expect(result.skipped).toBe(false);

    // Route handler created with canonical shape.
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    expect(existsSync(routePath)).toBe(true);
    const routeSrc = readFileSync(routePath, 'utf8');
    expect(routeSrc).toContain('createUploadKitHandler');
    expect(routeSrc).toContain('@uploadkitdev/next');
    expect(routeSrc).toContain('uploadkit:start');
    expect(routeSrc).toContain('export const { GET, POST }');

    // Client stub created.
    const clientPath = join(root, 'lib', 'uploadkit.ts');
    expect(existsSync(clientPath)).toBe(true);
    expect(readFileSync(clientPath, 'utf8')).toContain('ukRouter');

    // Layout wrapped with the provider, import added.
    const layoutPath = join(root, 'app', 'layout.tsx');
    const layoutSrc = readFileSync(layoutPath, 'utf8');
    expect(layoutSrc).toContain("from '@uploadkitdev/react'");
    expect(layoutSrc).toContain('UploadKitProvider');
    expect(layoutSrc).toContain('uploadkit:start');
    // Provider appears BETWEEN <body> and {children}, not replacing existing structure.
    const bodyOpen = layoutSrc.indexOf('<body');
    const providerOpen = layoutSrc.indexOf('<UploadKitProvider');
    const childrenRef = layoutSrc.indexOf('{children}');
    expect(bodyOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(childrenRef);
    // Original font/className is preserved.
    expect(layoutSrc).toContain('inter.className');

    // .env.local written with placeholder.
    const envPath = join(root, '.env.local');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');

    // Backup manifest exists + records the layout as 'modify'.
    const manifestPath = join(session.dir, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      entries: Array<{ action: string; relativePath: string }>;
    };
    const actions = Object.fromEntries(
      manifest.entries.map((e) => [e.relativePath.split(/[\\/]/).join('/'), e.action]),
    );
    expect(actions['app/layout.tsx']).toBe('modify');
    expect(actions['app/api/uploadkit/[...uploadkit]/route.ts']).toBe('create');
    expect(actions['lib/uploadkit.ts']).toBe('create');
  });

  it('preserves an existing .env.local key', async () => {
    const envPath = join(root, '.env.local');
    writeFileSync(envPath, 'UPLOADKIT_API_KEY=already_set\n', 'utf8');

    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-01Z' });
    await initNextApp(makeCtx(root), () => session);
    await session.finalize();

    const envContent = readFileSync(envPath, 'utf8');
    expect(envContent).toContain('UPLOADKIT_API_KEY=already_set');
    expect(envContent).not.toContain('uk_test_placeholder');
  });

  it('reports installed packages when skipInstall=false is NOT the case (skipInstall=true path)', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-02Z' });
    const result = await initNextApp(makeCtx(root), () => session);
    // skipInstall=true, so installed list still names the packages the user
    // would have installed — surfaces in the CLI summary.
    expect(result.installed).toEqual([
      '@uploadkitdev/next@latest',
      '@uploadkitdev/react@latest',
    ]);
  });
});

describe('initNextApp — idempotency (second run)', () => {
  it('second run prints "already configured" and makes zero file changes', async () => {
    const root = cloneFixture();

    // First run.
    const s1 = createBackupSession(root, { timestamp: '2026-04-15T00-00-10Z' });
    await initNextApp(makeCtx(root), () => s1);
    await s1.finalize();

    // Snapshot mtimes of every tracked file (excluding .uploadkit-backup).
    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const clientPath = join(root, 'lib', 'uploadkit.ts');
    const envPath = join(root, '.env.local');

    const before = {
      layout: statSync(layoutPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      client: statSync(clientPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    // Small delay to ensure mtime resolution would detect any write.
    await new Promise((r) => setTimeout(r, 20));

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T00-00-11Z' });
    const result = await initNextApp(makeCtx(root), () => s2);

    expect(result.skipped).toBe(true);
    expect(result.created).toEqual([]);
    expect(result.modified).toEqual([]);

    const after = {
      layout: statSync(layoutPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      client: statSync(clientPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    expect(after).toEqual(before);

    // Second session dir must not have been created (no finalize called in skipped path).
    expect(existsSync(s2.dir)).toBe(false);
  });
});

describe('initNextApp — backup fidelity', () => {
  it('backup of layout.tsx matches original byte-for-byte', async () => {
    const root = cloneFixture();
    const layoutPath = join(root, 'app', 'layout.tsx');
    const original = readFileSync(layoutPath);

    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-20Z' });
    await initNextApp(makeCtx(root), () => session);
    await session.finalize();

    const backedUp = readFileSync(join(session.dir, 'app', 'layout.tsx'));
    expect(backedUp.equals(original)).toBe(true);
  });
});

describe('initNextApp — preserves existing lib/uploadkit.ts', () => {
  it('does not overwrite lib/uploadkit.ts when it already exists', async () => {
    const root = cloneFixture();
    const clientPath = join(root, 'lib', 'uploadkit.ts');
    mkdirSync(dirname(clientPath), { recursive: true });
    const customContent = 'export const ukRouter = {} as never; // user-authored\n';
    writeFileSync(clientPath, customContent, 'utf8');

    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-30Z' });
    await initNextApp(makeCtx(root), () => session);
    await session.finalize();

    expect(readFileSync(clientPath, 'utf8')).toBe(customContent);
  });
});
