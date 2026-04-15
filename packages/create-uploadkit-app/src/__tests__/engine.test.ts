import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { copyTemplate } from '../engine/copy.js';
import { renderPlaceholders } from '../engine/render.js';
import { writeEnvLocal } from '../engine/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MINI_TEMPLATE = path.resolve(__dirname, '..', '__fixtures__', 'mini-template');

async function mkTmp(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'uploadkit-test-'));
  return dir;
}

describe('engine/copy.copyTemplate', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkTmp();
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('copies files recursively', async () => {
    await copyTemplate(MINI_TEMPLATE, tmp);
    expect(fs.existsSync(path.join(tmp, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'README.md'))).toBe(true);
  });

  it('renames _gitignore to .gitignore', async () => {
    await copyTemplate(MINI_TEMPLATE, tmp);
    expect(fs.existsSync(path.join(tmp, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '_gitignore'))).toBe(false);
  });

  it('renames _env.local to .env.local', async () => {
    const src = await mkTmp();
    try {
      await fsp.writeFile(path.join(src, '_env.local'), 'FOO=bar\n');
      await fsp.writeFile(path.join(src, '_env'), 'A=1\n');
      await copyTemplate(src, tmp);
      expect(fs.existsSync(path.join(tmp, '.env.local'))).toBe(true);
      expect(fs.existsSync(path.join(tmp, '.env'))).toBe(true);
      expect(fs.existsSync(path.join(tmp, '_env.local'))).toBe(false);
      expect(fs.existsSync(path.join(tmp, '_env'))).toBe(false);
    } finally {
      await fsp.rm(src, { recursive: true, force: true });
    }
  });

  it('skips node_modules, dist, .next, .svelte-kit, build, .react-router', async () => {
    const src = await mkTmp();
    try {
      for (const dir of ['node_modules', 'dist', '.next', '.svelte-kit', 'build', '.react-router']) {
        await fsp.mkdir(path.join(src, dir), { recursive: true });
        await fsp.writeFile(path.join(src, dir, 'junk.txt'), 'junk');
      }
      await fsp.writeFile(path.join(src, 'keep.txt'), 'keep');
      await copyTemplate(src, tmp);
      expect(fs.existsSync(path.join(tmp, 'keep.txt'))).toBe(true);
      for (const dir of ['node_modules', 'dist', '.next', '.svelte-kit', 'build', '.react-router']) {
        expect(fs.existsSync(path.join(tmp, dir))).toBe(false);
      }
    } finally {
      await fsp.rm(src, { recursive: true, force: true });
    }
  });

  it('copies nested directories', async () => {
    const src = await mkTmp();
    try {
      await fsp.mkdir(path.join(src, 'a', 'b'), { recursive: true });
      await fsp.writeFile(path.join(src, 'a', 'b', 'deep.txt'), 'deep');
      await copyTemplate(src, tmp);
      expect(fs.existsSync(path.join(tmp, 'a', 'b', 'deep.txt'))).toBe(true);
    } finally {
      await fsp.rm(src, { recursive: true, force: true });
    }
  });
});

describe('engine/render.renderPlaceholders', () => {
  it('replaces {{name}}, {{pkgManager}}, {{year}}', () => {
    const out = renderPlaceholders(
      'hello {{name}} from {{pkgManager}} in {{year}}',
      { name: 'my-app', pkgManager: 'pnpm', year: '2026' },
    );
    expect(out).toBe('hello my-app from pnpm in 2026');
  });

  it('replaces all occurrences', () => {
    const out = renderPlaceholders('{{name}} {{name}} {{name}}', {
      name: 'x',
      pkgManager: 'npm',
      year: '2026',
    });
    expect(out).toBe('x x x');
  });

  it('leaves unknown placeholders untouched', () => {
    const out = renderPlaceholders('{{other}} {{name}}', {
      name: 'foo',
      pkgManager: 'npm',
      year: '2026',
    });
    expect(out).toBe('{{other}} foo');
  });
});

describe('engine/env.writeEnvLocal', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkTmp();
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('writes .env.local with placeholder key and signup link', async () => {
    await writeEnvLocal(tmp);
    const body = await fsp.readFile(path.join(tmp, '.env.local'), 'utf8');
    expect(body).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');
    expect(body).toContain('https://uploadkit.dev/signup');
  });

  it('does not overwrite existing .env.local', async () => {
    await fsp.writeFile(path.join(tmp, '.env.local'), 'EXISTING=1\n');
    await writeEnvLocal(tmp);
    const body = await fsp.readFile(path.join(tmp, '.env.local'), 'utf8');
    expect(body).toBe('EXISTING=1\n');
  });
});

describe('engine end-to-end against mini-template', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkTmp();
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('copies, renames, renders, and scaffolds env', async () => {
    await copyTemplate(MINI_TEMPLATE, tmp);

    // render placeholders in the three files that ship them
    const vars = { name: 'demo-app', pkgManager: 'pnpm', year: '2026' };
    for (const rel of ['package.json', 'README.md']) {
      const p = path.join(tmp, rel);
      const raw = await fsp.readFile(p, 'utf8');
      await fsp.writeFile(p, renderPlaceholders(raw, vars));
    }

    await writeEnvLocal(tmp);

    expect(fs.existsSync(path.join(tmp, '.gitignore'))).toBe(true);
    const pkg = JSON.parse(await fsp.readFile(path.join(tmp, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-app');
    expect(pkg.scripts.dev).toBe('pnpm run dev');
    const readme = await fsp.readFile(path.join(tmp, 'README.md'), 'utf8');
    expect(readme).toContain('# demo-app');
    expect(readme).toContain('2026');
    const env = await fsp.readFile(path.join(tmp, '.env.local'), 'utf8');
    expect(env).toContain('uk_test_placeholder');
  });
});
