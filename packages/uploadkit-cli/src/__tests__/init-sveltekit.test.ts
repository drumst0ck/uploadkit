import { describe, it, expect, beforeEach } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { initSvelteKit } from '../init/sveltekit.js';
import { createBackupSession } from '../backup/backup.js';
import type { InitContext } from '../init/types.js';

const FIXTURE_DIR = resolve(
  dirname(new URL(import.meta.url).pathname),
  '..',
  '__fixtures__',
  'projects',
  'sveltekit',
);

function cloneFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uploadkit-init-svelte-'));
  cpSync(FIXTURE_DIR, dir, { recursive: true });
  return dir;
}

function makeCtx(root: string): InitContext {
  return {
    root,
    detection: {
      framework: 'sveltekit',
      root,
      packageManager: 'pnpm',
    },
    flags: {
      yes: true,
      skipInstall: true,
    },
  };
}

describe('initSvelteKit — fresh run', () => {
  let root: string;

  beforeEach(() => {
    root = cloneFixture();
  });

  it('creates +server.ts route handler, client stub, .env, and records backup entries', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T01-00-00Z' });
    const result = await initSvelteKit(makeCtx(root), () => session);
    await session.finalize();

    expect(result.skipped).toBe(false);

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
    // Core import lives in the client stub, not the +server route.
    const clientPath = join(root, 'src', 'lib', 'uploadkit.ts');
    expect(existsSync(clientPath)).toBe(true);
    const clientSrc = readFileSync(clientPath, 'utf8');
    expect(clientSrc).toContain('ukRouter');
    expect(clientSrc).toContain('@uploadkitdev/next');

    // .env (not .env.local — Vite-based, but plan says .env)
    const envPath = join(root, '.env');
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');

    // Layout file MUST remain untouched (no Svelte mutation).
    const layoutPath = join(root, 'src', 'routes', '+layout.svelte');
    const layoutSrc = readFileSync(layoutPath, 'utf8');
    expect(layoutSrc).not.toContain('UploadKit');

    // Manifest records creates, NOT modifies for layout.
    const manifest = JSON.parse(readFileSync(join(session.dir, 'manifest.json'), 'utf8')) as {
      entries: Array<{ action: string; relativePath: string }>;
    };
    const actions = Object.fromEntries(
      manifest.entries.map((e) => [e.relativePath.split(/[\\/]/).join('/'), e.action]),
    );
    expect(actions['src/routes/api/uploadkit/[...uploadkit]/+server.ts']).toBe('create');
    expect(actions['src/lib/uploadkit.ts']).toBe('create');
    expect(actions['.env']).toBe('create');
    expect(actions['src/routes/+layout.svelte']).toBeUndefined();
  });

  it('reports installed packages (next handler + core, no React provider)', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T01-00-01Z' });
    const result = await initSvelteKit(makeCtx(root), () => session);
    expect(result.installed).toEqual([
      '@uploadkitdev/next@latest',
      '@uploadkitdev/core@latest',
    ]);
    // Must NOT pull in @uploadkitdev/react — no provider in Svelte.
    expect(result.installed.some((p) => p.includes('react'))).toBe(false);
  });
});

describe('initSvelteKit — idempotency (second run)', () => {
  it('second run is a no-op; mtimes preserved; no new session dir', async () => {
    const root = cloneFixture();

    const s1 = createBackupSession(root, { timestamp: '2026-04-15T01-10-00Z' });
    await initSvelteKit(makeCtx(root), () => s1);
    await s1.finalize();

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

    await new Promise((r) => setTimeout(r, 20));

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T01-10-01Z' });
    const result = await initSvelteKit(makeCtx(root), () => s2);

    expect(result.skipped).toBe(true);
    expect(result.created).toEqual([]);
    expect(result.modified).toEqual([]);

    const after = {
      route: statSync(routePath).mtimeMs,
      client: statSync(clientPath).mtimeMs,
      env: statSync(envPath).mtimeMs,
    };
    expect(after).toEqual(before);

    expect(existsSync(s2.dir)).toBe(false);
  });
});

describe('sveltekit templates — only use exported APIs', () => {
  const TEMPLATES = resolve(dirname(new URL(import.meta.url).pathname), '..', 'init', 'templates');
  const NEXT_INDEX = resolve(
    dirname(new URL(import.meta.url).pathname),
    '..', '..', '..', 'next', 'src', 'index.ts',
  );

  function exportedNames(src: string): Set<string> {
    const names = new Set<string>();
    for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
      for (const part of m[1]!.split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop();
        if (n) names.add(n);
      }
    }
    return names;
  }

  it('imports from @uploadkitdev/next only names the package exports', () => {
    const exported = exportedNames(readFileSync(NEXT_INDEX, 'utf8'));
    for (const tpl of ['sveltekit-server.ts.tpl', 'sveltekit-client.ts.tpl']) {
      const src = readFileSync(join(TEMPLATES, tpl), 'utf8');
      for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+'@uploadkitdev\/next'/g)) {
        for (const part of m[1]!.split(',')) {
          const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!;
          expect(exported.has(name), `${tpl} imports "${name}" which @uploadkitdev/next does not export`).toBe(true);
        }
      }
    }
  });

  it('server template does not call removed/nonexistent client methods or $lib', () => {
    const src = readFileSync(join(TEMPLATES, 'sveltekit-server.ts.tpl'), 'utf8');
    expect(src).not.toMatch(/\.handle\(/);
    expect(src).not.toContain('$lib');
    expect(src).toContain('createUploadKitHandler');
  });
});
