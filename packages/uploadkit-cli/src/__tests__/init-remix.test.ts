import { describe, it, expect, beforeEach } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { initRemix } from '../init/remix.js';
import { createBackupSession } from '../backup/backup.js';
import type { InitContext } from '../init/types.js';

const FIXTURE_DIR = resolve(
  dirname(new URL(import.meta.url).pathname),
  '..',
  '__fixtures__',
  'projects',
  'remix',
);

function cloneFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uploadkit-init-remix-'));
  cpSync(FIXTURE_DIR, dir, { recursive: true });
  return dir;
}

function makeCtx(root: string): InitContext {
  return {
    root,
    detection: {
      framework: 'remix',
      root,
      packageManager: 'bun',
    },
    flags: {
      yes: true,
      skipInstall: true,
    },
  };
}

describe('initRemix — fresh run', () => {
  let root: string;

  beforeEach(() => {
    root = cloneFixture();
  });

  it('creates api.uploadkit.$.tsx, wraps root.tsx body, writes .env', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T02-00-00Z' });
    const result = await initRemix(makeCtx(root), session);
    await session.finalize();

    expect(result.skipped).toBe(false);

    const routePath = join(root, 'app', 'routes', 'api.uploadkit.$.tsx');
    expect(existsSync(routePath)).toBe(true);
    const routeSrc = readFileSync(routePath, 'utf8');
    expect(routeSrc).toContain('uploadkit:start');
    expect(routeSrc).toMatch(/export\s+(async\s+)?function\s+action/);
    expect(routeSrc).toMatch(/export\s+(async\s+)?function\s+loader/);

    const rootPath = join(root, 'app', 'root.tsx');
    const rootSrc = readFileSync(rootPath, 'utf8');
    expect(rootSrc).toContain('@uploadkitdev/react');
    expect(rootSrc).toContain('<UploadKitProvider');
    expect(rootSrc).toContain('uploadkit:start');
    // Provider is between <body> and <Outlet/>.
    const bodyOpen = rootSrc.indexOf('<body');
    const providerOpen = rootSrc.indexOf('<UploadKitProvider');
    const outletRef = rootSrc.indexOf('<Outlet');
    expect(bodyOpen).toBeLessThan(providerOpen);
    expect(providerOpen).toBeLessThan(outletRef);

    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');

    const manifest = JSON.parse(readFileSync(join(session.dir, 'manifest.json'), 'utf8')) as {
      entries: Array<{ action: string; relativePath: string }>;
    };
    const actions = Object.fromEntries(
      manifest.entries.map((e) => [e.relativePath.split(/[\\/]/).join('/'), e.action]),
    );
    expect(actions['app/root.tsx']).toBe('modify');
    expect(actions['app/routes/api.uploadkit.$.tsx']).toBe('create');
    expect(actions['.env']).toBe('create');
  });

  it('reports both react + core packages installed', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T02-00-01Z' });
    const result = await initRemix(makeCtx(root), session);
    expect(result.installed).toEqual([
      '@uploadkitdev/react@latest',
      '@uploadkitdev/core@latest',
    ]);
  });

  it('backs up app/root.tsx byte-for-byte before mutation', async () => {
    const rootPath = join(root, 'app', 'root.tsx');
    const original = readFileSync(rootPath);

    const session = createBackupSession(root, { timestamp: '2026-04-15T02-00-02Z' });
    await initRemix(makeCtx(root), session);
    await session.finalize();

    const backedUp = readFileSync(join(session.dir, 'app', 'root.tsx'));
    expect(backedUp.equals(original)).toBe(true);
  });
});

describe('initRemix — idempotency (second run)', () => {
  it('second run is a no-op', async () => {
    const root = cloneFixture();

    const s1 = createBackupSession(root, { timestamp: '2026-04-15T02-10-00Z' });
    await initRemix(makeCtx(root), s1);
    await s1.finalize();

    const rootPath = join(root, 'app', 'root.tsx');
    const routePath = join(root, 'app', 'routes', 'api.uploadkit.$.tsx');
    const envPath = join(root, '.env');
    const before = {
      root: statSync(rootPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };

    await new Promise((r) => setTimeout(r, 20));

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T02-10-01Z' });
    const result = await initRemix(makeCtx(root), s2);

    expect(result.skipped).toBe(true);
    expect(result.created).toEqual([]);
    expect(result.modified).toEqual([]);

    const after = {
      root: statSync(rootPath).mtimeMs,
      route: statSync(routePath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);
    expect(existsSync(s2.dir)).toBe(false);
  });
});
