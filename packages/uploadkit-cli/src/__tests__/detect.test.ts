import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { detectFramework } from '../detect/framework.js';
import { detectPackageManager } from '../detect/package-manager.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(here, '../__fixtures__/projects');

function fixture(name: string): string {
  const p = join(fixturesDir, name);
  if (!existsSync(p)) throw new Error(`Missing fixture: ${p}`);
  return p;
}

describe('detectFramework — fixture matrix', () => {
  it('next-app fixture → next-app (pnpm)', () => {
    const result = detectFramework(fixture('next-app'));
    expect(result.framework).toBe('next-app');
    expect(result.packageManager).toBe('pnpm');
    expect(result.root).toBe(fixture('next-app'));
    expect(result.reason).toBeUndefined();
  });

  it('next-pages fixture → next-pages refusal with reason (npm)', () => {
    const result = detectFramework(fixture('next-pages'));
    expect(result.framework).toBe('next-pages');
    expect(result.packageManager).toBe('npm');
    expect(result.reason).toMatch(/Pages Router/i);
  });

  it('sveltekit fixture → sveltekit (yarn)', () => {
    const result = detectFramework(fixture('sveltekit'));
    expect(result.framework).toBe('sveltekit');
    expect(result.packageManager).toBe('yarn');
    expect(result.reason).toBeUndefined();
  });

  it('remix fixture → remix (bun)', () => {
    const result = detectFramework(fixture('remix'));
    expect(result.framework).toBe('remix');
    expect(result.packageManager).toBe('bun');
    expect(result.reason).toBeUndefined();
  });

  it('vite-react fixture → vite-react (pnpm)', () => {
    const result = detectFramework(fixture('vite-react'));
    expect(result.framework).toBe('vite-react');
    expect(result.packageManager).toBe('pnpm');
    expect(result.reason).toBeUndefined();
  });

  it('unknown fixture → unknown with reason (npm fallback)', () => {
    const result = detectFramework(fixture('unknown'));
    expect(result.framework).toBe('unknown');
    expect(result.reason).toMatch(/No supported framework/i);
    // Fixture has no lockfile → env UA or npm fallback.
    expect(['npm', 'pnpm', 'yarn', 'bun']).toContain(result.packageManager);
  });
});

describe('detectFramework — extra rules', () => {
  let tmp: string;
  const tmps: string[] = [];

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'uploadkit-detect-'));
    tmps.push(tmp);
  });

  afterAll(() => {
    for (const p of tmps) {
      try {
        rmSync(p, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('refuses @react-router/dev as remix variant', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({
        name: 't',
        dependencies: { react: '19.0.0' },
        devDependencies: { '@react-router/dev': '7.0.0' },
      }),
    );
    const result = detectFramework(tmp);
    expect(result.framework).toBe('remix');
  });

  it('walks up from a nested directory to find package.json', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({
        name: 't',
        dependencies: { next: '16.0.0' },
      }),
    );
    mkdirSync(join(tmp, 'app'));
    writeFileSync(join(tmp, 'app', 'layout.tsx'), '');
    const nested = join(tmp, 'app', 'deep', 'nested');
    mkdirSync(nested, { recursive: true });
    const result = detectFramework(nested);
    expect(result.framework).toBe('next-app');
    expect(result.root).toBe(tmp);
  });

  it('next + no app/ + no pages/_app.* → unknown with diagnostic reason', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({
        name: 't',
        dependencies: { next: '16.0.0' },
      }),
    );
    const result = detectFramework(tmp);
    expect(result.framework).toBe('unknown');
    expect(result.reason).toMatch(/Next\.js/i);
  });

  it('falls back to unknown with listed missing deps', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
    );
    const result = detectFramework(tmp);
    expect(result.framework).toBe('unknown');
    expect(result.reason).toMatch(/next/);
    expect(result.reason).toMatch(/vite/);
  });

  it('vite without react is not vite-react', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({
        name: 't',
        devDependencies: { vite: '7.0.0' },
      }),
    );
    const result = detectFramework(tmp);
    expect(result.framework).toBe('unknown');
  });

  it('detects via src/app for next-app', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 't', dependencies: { next: '16.0.0' } }),
    );
    mkdirSync(join(tmp, 'src', 'app'), { recursive: true });
    const result = detectFramework(tmp);
    expect(result.framework).toBe('next-app');
  });
});

describe('detectPackageManager', () => {
  let tmp: string;
  const tmps: string[] = [];

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'uploadkit-pm-'));
    tmps.push(tmp);
  });

  afterAll(() => {
    for (const p of tmps) {
      try {
        rmSync(p, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('prefers pnpm-lock.yaml over everything', () => {
    writeFileSync(join(tmp, 'pnpm-lock.yaml'), '');
    writeFileSync(join(tmp, 'package-lock.json'), '{}');
    writeFileSync(join(tmp, 'yarn.lock'), '');
    expect(detectPackageManager(tmp)).toBe('pnpm');
  });

  it('detects bun via bun.lock', () => {
    writeFileSync(join(tmp, 'bun.lock'), '');
    expect(detectPackageManager(tmp)).toBe('bun');
  });

  it('detects bun via bun.lockb', () => {
    writeFileSync(join(tmp, 'bun.lockb'), '');
    expect(detectPackageManager(tmp)).toBe('bun');
  });

  it('detects yarn via yarn.lock', () => {
    writeFileSync(join(tmp, 'yarn.lock'), '');
    expect(detectPackageManager(tmp)).toBe('yarn');
  });

  it('detects npm via package-lock.json', () => {
    writeFileSync(join(tmp, 'package-lock.json'), '{}');
    expect(detectPackageManager(tmp)).toBe('npm');
  });

  it('falls back to npm_config_user_agent when no lockfile', () => {
    const prev = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = 'pnpm/9.0.0 npm/? node/v20.0.0';
    try {
      expect(detectPackageManager(tmp)).toBe('pnpm');
    } finally {
      if (prev === undefined) delete process.env.npm_config_user_agent;
      else process.env.npm_config_user_agent = prev;
    }
  });

  it('falls back to npm when nothing matches', () => {
    const prev = process.env.npm_config_user_agent;
    delete process.env.npm_config_user_agent;
    try {
      expect(detectPackageManager(tmp)).toBe('npm');
    } finally {
      if (prev !== undefined) process.env.npm_config_user_agent = prev;
    }
  });
});
