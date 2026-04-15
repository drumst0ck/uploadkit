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

describe('templates/remix end-to-end scaffold', () => {
  let tmp: string;
  let projectDir: string;

  beforeEach(async () => {
    tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'uk-template-remix-'));
    projectDir = path.join(tmp, 'demo-rr');
  });

  afterEach(async () => {
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  it('scaffolds the React Router v7 (remix) template with expected files and deps', async () => {
    const opts: ResolvedOptions = {
      name: 'demo-rr',
      projectDir,
      template: 'remix',
      pm: 'pnpm',
      typescript: true,
      install: false,
      gitInit: false,
    };

    await scaffold(opts, { templatesRoot: TEMPLATES_ROOT });

    const expected = [
      'package.json',
      'react-router.config.ts',
      'vite.config.ts',
      'tsconfig.json',
      'README.md',
      '.gitignore',
      '.env.local',
      'app/root.tsx',
      'app/entry.client.tsx',
      'app/entry.server.tsx',
      'app/routes.ts',
      'app/routes/_index.tsx',
      'app/routes/api.sign.ts',
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
    expect(pkg.name).toBe('demo-rr');

    // Runtime deps — React Router v7 framework mode + UploadKit React SDK +
    // AWS SDK for server-side presigning.
    expect(pkg.dependencies['react-router']).toBeDefined();
    expect(pkg.dependencies['@react-router/node']).toBeDefined();
    expect(pkg.dependencies['@react-router/serve']).toBeDefined();
    expect(pkg.dependencies['react']).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();
    expect(pkg.dependencies['isbot']).toBeDefined();
    expect(pkg.dependencies['@uploadkitdev/react']).toBeDefined();
    expect(pkg.dependencies['@aws-sdk/client-s3']).toBeDefined();
    expect(pkg.dependencies['@aws-sdk/s3-request-presigner']).toBeDefined();

    // Dev deps
    expect(pkg.devDependencies['@react-router/dev']).toBeDefined();
    expect(pkg.devDependencies['typescript']).toBeDefined();
    expect(pkg.devDependencies['vite']).toBeDefined();
    expect(pkg.devDependencies['@types/react']).toBeDefined();
    expect(pkg.devDependencies['@types/react-dom']).toBeDefined();

    // Scripts
    expect(pkg.scripts['dev']).toBe('react-router dev');
    expect(pkg.scripts['build']).toBe('react-router build');
    expect(pkg.scripts['start']).toContain('react-router-serve');

    // README placeholders rendered
    const readme = await fsp.readFile(
      path.join(projectDir, 'README.md'),
      'utf8',
    );
    expect(readme).toContain('# demo-rr');
    expect(readme).toContain('pnpm dev');
    expect(readme).toMatch(/©\s+\d{4}\s+demo-rr/);
    expect(readme).not.toContain('{{name}}');
    expect(readme).not.toContain('{{pkgManager}}');
    expect(readme).not.toContain('{{year}}');

    // .env.local ships with managed placeholder key + BYOS hints
    const env = await fsp.readFile(
      path.join(projectDir, '.env.local'),
      'utf8',
    );
    expect(env).toContain('UPLOADKIT_API_KEY=uk_test_placeholder');
    expect(env).toContain('https://uploadkit.dev/signup');
    expect(env).toContain('R2_ACCOUNT_ID');
    expect(env).toContain('R2_BUCKET');

    // routes.ts wires the two routes
    const routes = await fsp.readFile(
      path.join(projectDir, 'app/routes.ts'),
      'utf8',
    );
    expect(routes).toContain("index('./routes/_index.tsx')");
    expect(routes).toContain("api/sign");
    expect(routes).toContain('./routes/api.sign.ts');

    // _index.tsx renders UploadDropzone from @uploadkitdev/react
    const indexSrc = await fsp.readFile(
      path.join(projectDir, 'app/routes/_index.tsx'),
      'utf8',
    );
    expect(indexSrc).toContain('@uploadkitdev/react');
    expect(indexSrc).toContain('UploadKitProvider');
    expect(indexSrc).toContain('UploadDropzone');
    expect(indexSrc).toContain("endpoint=\"/api/sign\"");

    // api.sign.ts exports an action() + uses presigned URL machinery
    const signSrc = await fsp.readFile(
      path.join(projectDir, 'app/routes/api.sign.ts'),
      'utf8',
    );
    expect(signSrc).toMatch(/export\s+(async\s+)?function\s+action/);
    expect(signSrc).toContain('getSignedUrl');
    expect(signSrc).toContain('PutObjectCommand');
    expect(signSrc).toContain('ContentType');
    expect(signSrc).toContain('R2_BUCKET');
  });
});
