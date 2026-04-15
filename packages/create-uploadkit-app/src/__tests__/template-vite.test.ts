import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scaffold } from '../engine/index.js';
import type { ResolvedOptions } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..', 'templates');

describe('templates/vite end-to-end scaffold', () => {
  let tmp: string;
  let projectDir: string;

  beforeEach(async () => {
    tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'uk-template-vite-'));
    projectDir = path.join(tmp, 'demo-app');
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('scaffolds the Vite template with expected files and deps', async () => {
    const opts: ResolvedOptions = {
      name: 'demo-app',
      projectDir,
      template: 'vite',
      pm: 'pnpm',
      typescript: true,
      install: false,
      gitInit: false,
    };

    await scaffold(opts, { templatesRoot: TEMPLATES_ROOT });

    // Expected files exist
    const expected = [
      'package.json',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'index.html',
      'README.md',
      '.gitignore',
      '.env.local',
      'src/main.tsx',
      'src/App.tsx',
      'src/index.css',
    ];
    for (const rel of expected) {
      expect(
        fs.existsSync(path.join(projectDir, rel)),
        `expected ${rel} to exist`,
      ).toBe(true);
    }

    // package.json name, scripts, deps
    const pkgRaw = await fsp.readFile(
      path.join(projectDir, 'package.json'),
      'utf8',
    );
    const pkg = JSON.parse(pkgRaw) as {
      name: string;
      type: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(pkg.name).toBe('demo-app');
    expect(pkg.type).toBe('module');

    // runtime deps
    expect(pkg.dependencies['@uploadkitdev/react']).toBeDefined();
    expect(pkg.dependencies['react']).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();

    // dev deps
    expect(pkg.devDependencies['vite']).toBeDefined();
    expect(pkg.devDependencies['@vitejs/plugin-react']).toBeDefined();
    expect(pkg.devDependencies['typescript']).toBeDefined();
    expect(pkg.devDependencies['@types/react']).toBeDefined();
    expect(pkg.devDependencies['@types/react-dom']).toBeDefined();

    // No server deps — this is a pure SPA
    expect(pkg.dependencies['@uploadkitdev/next']).toBeUndefined();
    expect(pkg.dependencies['next']).toBeUndefined();
    expect(pkg.dependencies['@aws-sdk/client-s3']).toBeUndefined();
    expect(pkg.dependencies['@aws-sdk/s3-request-presigner']).toBeUndefined();
    expect(pkg.dependencies['express']).toBeUndefined();
    expect(pkg.dependencies['hono']).toBeUndefined();

    // Scripts
    expect(pkg.scripts['dev']).toBe('vite');
    expect(pkg.scripts['build']).toContain('vite build');
    expect(pkg.scripts['preview']).toBe('vite preview');

    // README rendered placeholders + BYOS guidance
    const readme = await fsp.readFile(
      path.join(projectDir, 'README.md'),
      'utf8',
    );
    expect(readme).toContain('# demo-app');
    expect(readme).toContain('pnpm dev');
    expect(readme).toMatch(/©\s+\d{4}\s+demo-app/);
    expect(readme).toContain('BYOS');
    expect(readme).toContain('/api/sign');
    expect(readme).toMatch(/prototyping/i);
    expect(readme).not.toContain('{{name}}');
    expect(readme).not.toContain('{{pkgManager}}');
    expect(readme).not.toContain('{{year}}');

    // .env.local has placeholder test key (never live) + VITE_ endpoint
    const env = await fsp.readFile(
      path.join(projectDir, '.env.local'),
      'utf8',
    );
    expect(env).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');
    expect(env).toContain('VITE_UPLOADKIT_ENDPOINT=/api/sign');
    // Never a live key as a value (comments may warn about uk_live_*)
    expect(env).not.toMatch(/^[^#]*=uk_live_/m);
    expect(env).not.toMatch(/^[^#]*VITE_[A-Z_]*=uk_live_/m);
    expect(env).toContain('https://uploadkit.dev/signup');

    // App.tsx imports from @uploadkitdev/react and uses the provider + dropzone
    const appSrc = await fsp.readFile(
      path.join(projectDir, 'src/App.tsx'),
      'utf8',
    );
    expect(appSrc).toContain('@uploadkitdev/react');
    expect(appSrc).toContain('UploadKitProvider');
    expect(appSrc).toContain('UploadDropzone');
    expect(appSrc).toContain('VITE_UPLOADKIT_ENDPOINT');
    // Ensure no 'use client' directive (this is a Vite SPA, not Next)
    expect(appSrc).not.toContain("'use client'");

    // main.tsx bootstraps React 19 createRoot and imports SDK styles
    const mainSrc = await fsp.readFile(
      path.join(projectDir, 'src/main.tsx'),
      'utf8',
    );
    expect(mainSrc).toContain('createRoot');
    expect(mainSrc).toContain('@uploadkitdev/react/styles.css');
    expect(mainSrc).toContain('StrictMode');

    // vite.config.ts wires the React plugin
    const viteCfg = await fsp.readFile(
      path.join(projectDir, 'vite.config.ts'),
      'utf8',
    );
    expect(viteCfg).toContain('@vitejs/plugin-react');
    expect(viteCfg).toContain('defineConfig');

    // index.html mounts #root and loads src/main.tsx
    const html = await fsp.readFile(
      path.join(projectDir, 'index.html'),
      'utf8',
    );
    expect(html).toContain('id="root"');
    expect(html).toContain('/src/main.tsx');
  });
});
