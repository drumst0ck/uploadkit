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

describe('templates/next end-to-end scaffold', () => {
  let tmp: string;
  let projectDir: string;

  beforeEach(async () => {
    tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'uk-template-next-'));
    projectDir = path.join(tmp, 'demo-app');
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('scaffolds the Next.js template with expected files and deps', async () => {
    const opts: ResolvedOptions = {
      name: 'demo-app',
      projectDir,
      template: 'next',
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
      'next.config.ts',
      'postcss.config.mjs',
      'README.md',
      '.gitignore',
      '.env.local',
      'app/layout.tsx',
      'app/page.tsx',
      'app/globals.css',
      'app/api/uploadkit/[...uploadkit]/route.ts',
      'app/api/uploadkit/[...uploadkit]/core.ts',
    ];
    for (const rel of expected) {
      expect(
        fs.existsSync(path.join(projectDir, rel)),
        `expected ${rel} to exist`,
      ).toBe(true);
    }

    // package.json name and deps
    const pkgRaw = await fsp.readFile(
      path.join(projectDir, 'package.json'),
      'utf8',
    );
    const pkg = JSON.parse(pkgRaw) as {
      name: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(pkg.name).toBe('demo-app');
    expect(pkg.dependencies['@uploadkitdev/react']).toBeDefined();
    expect(pkg.dependencies['@uploadkitdev/next']).toBeDefined();
    expect(pkg.dependencies['next']).toBeDefined();
    expect(pkg.dependencies['react']).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();
    expect(pkg.devDependencies['tailwindcss']).toBeDefined();
    expect(pkg.devDependencies['typescript']).toBeDefined();
    expect(pkg.scripts['dev']).toBe('next dev --turbopack');
    expect(pkg.scripts['build']).toBe('next build');

    // README rendered placeholders
    const readme = await fsp.readFile(
      path.join(projectDir, 'README.md'),
      'utf8',
    );
    expect(readme).toContain('# demo-app');
    expect(readme).toContain('pnpm dev');
    expect(readme).toMatch(/©\s+\d{4}\s+demo-app/);
    expect(readme).not.toContain('{{name}}');
    expect(readme).not.toContain('{{pkgManager}}');
    expect(readme).not.toContain('{{year}}');

    // .env.local has placeholder key (template ships its own — writeEnvLocal no-ops)
    const env = await fsp.readFile(
      path.join(projectDir, '.env.local'),
      'utf8',
    );
    expect(env).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');
    expect(env).toContain('https://uploadkit.dev/signup');

    // Route handler uses the SDK handler factory
    const routeSrc = await fsp.readFile(
      path.join(projectDir, 'app/api/uploadkit/[...uploadkit]/route.ts'),
      'utf8',
    );
    expect(routeSrc).toContain('createUploadKitHandler');
    expect(routeSrc).toContain('@uploadkitdev/next');

    // Page uses the provider + dropzone
    const pageSrc = await fsp.readFile(
      path.join(projectDir, 'app/page.tsx'),
      'utf8',
    );
    expect(pageSrc).toContain("'use client'");
    expect(pageSrc).toContain('UploadKitProvider');
    expect(pageSrc).toContain('UploadDropzone');
    expect(pageSrc).toContain('/api/uploadkit');

    // layout imports UploadKit styles + globals (no placeholders in TSX files)
    const layoutSrc = await fsp.readFile(
      path.join(projectDir, 'app/layout.tsx'),
      'utf8',
    );
    expect(layoutSrc).toContain('@uploadkitdev/react/styles.css');
    expect(layoutSrc).toContain('./globals.css');
    expect(layoutSrc).not.toContain('{{name}}');
  });
});
