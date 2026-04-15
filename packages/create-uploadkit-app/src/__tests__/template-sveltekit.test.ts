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

describe('templates/sveltekit end-to-end scaffold', () => {
  let tmp: string;
  let projectDir: string;

  beforeEach(async () => {
    tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'uk-template-sveltekit-'));
    projectDir = path.join(tmp, 'demo-sk');
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('scaffolds the SvelteKit template with expected files and deps', async () => {
    const opts: ResolvedOptions = {
      name: 'demo-sk',
      projectDir,
      template: 'sveltekit',
      pm: 'pnpm',
      typescript: true,
      install: false,
      gitInit: false,
    };

    await scaffold(opts, { templatesRoot: TEMPLATES_ROOT });

    const expected = [
      'package.json',
      'svelte.config.js',
      'vite.config.ts',
      'tsconfig.json',
      'README.md',
      '.gitignore',
      '.env.local',
      'src/app.html',
      'src/app.d.ts',
      'src/routes/+page.svelte',
      'src/routes/api/sign/+server.ts',
    ];
    for (const rel of expected) {
      expect(
        fs.existsSync(path.join(projectDir, rel)),
        `expected ${rel} to exist`,
      ).toBe(true);
    }

    // package.json
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
    expect(pkg.name).toBe('demo-sk');
    expect(pkg.dependencies['@aws-sdk/client-s3']).toBeDefined();
    expect(pkg.dependencies['@aws-sdk/s3-request-presigner']).toBeDefined();
    expect(pkg.devDependencies['@sveltejs/kit']).toBeDefined();
    expect(pkg.devDependencies['@sveltejs/adapter-auto']).toBeDefined();
    expect(pkg.devDependencies['svelte']).toBeDefined();
    expect(pkg.devDependencies['vite']).toBeDefined();
    expect(pkg.devDependencies['typescript']).toBeDefined();
    // No React in a SvelteKit template
    expect(pkg.dependencies['react']).toBeUndefined();
    expect(pkg.dependencies['@uploadkitdev/react']).toBeUndefined();
    expect(pkg.scripts['dev']).toBe('vite dev');
    expect(pkg.scripts['build']).toBe('vite build');

    // README placeholders rendered
    const readme = await fsp.readFile(
      path.join(projectDir, 'README.md'),
      'utf8',
    );
    expect(readme).toContain('# demo-sk');
    expect(readme).toContain('pnpm dev');
    expect(readme).toMatch(/©\s+\d{4}\s+demo-sk/);
    expect(readme).not.toContain('{{name}}');
    expect(readme).not.toContain('{{pkgManager}}');
    expect(readme).not.toContain('{{year}}');

    // env.local ships with managed placeholder key + BYOS hints
    const env = await fsp.readFile(
      path.join(projectDir, '.env.local'),
      'utf8',
    );
    expect(env).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');
    expect(env).toContain('https://uploadkit.dev/signup');
    expect(env).toContain('R2_ACCOUNT_ID');
    expect(env).toContain('R2_BUCKET');

    // svelte.config.js uses adapter-auto
    const svelteConfig = await fsp.readFile(
      path.join(projectDir, 'svelte.config.js'),
      'utf8',
    );
    expect(svelteConfig).toContain('@sveltejs/adapter-auto');

    // +server.ts uses presigned URL machinery
    const serverSrc = await fsp.readFile(
      path.join(projectDir, 'src/routes/api/sign/+server.ts'),
      'utf8',
    );
    expect(serverSrc).toContain('getSignedUrl');
    expect(serverSrc).toContain('PutObjectCommand');
    expect(serverSrc).toContain('ContentType');
    expect(serverSrc).toContain('R2_BUCKET');

    // +page.svelte is Svelte 5 runes + fetches /api/sign
    const pageSrc = await fsp.readFile(
      path.join(projectDir, 'src/routes/+page.svelte'),
      'utf8',
    );
    expect(pageSrc).toContain('$state');
    expect(pageSrc).toContain("type=\"file\"");
    expect(pageSrc).toContain('/api/sign');
    expect(pageSrc).toContain('PUT');
  });
});
