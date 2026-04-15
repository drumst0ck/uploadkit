import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';

import type { ResolvedOptions } from '../types.js';
import { copyTemplate } from './copy.js';
import { renderProjectFiles, type TemplateVars } from './render.js';
import { writeEnvLocal } from './env.js';
import { installDeps } from './install.js';
import { initGit } from './git.js';

/**
 * Resolve the templates directory for both:
 *   - production: bundled `dist/index.js` at `packages/create-uploadkit-app/dist/index.js`,
 *     templates sit at `../templates` relative to that file.
 *   - dev / tests: ts source at `packages/create-uploadkit-app/src/engine/index.ts`,
 *     templates sit at `../../templates` relative to this file.
 * We try the two well-known candidates and pick whichever exists.
 *
 * The package is ESM-only (`"type": "module"`, ESM-only tsup build), so
 * `import.meta.url` is always defined here.
 */
export function resolveTemplatesRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '..', 'templates'), // dist/index.js → ../templates
    path.resolve(here, '..', '..', 'templates'), // src/engine/index.ts → ../../templates
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fall back to the first candidate so error messages still reference a path.
  return candidates[0] ?? path.resolve(here, '..', 'templates');
}

async function dirIsEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fsp.readdir(dir);
    return entries.length === 0;
  } catch {
    return true;
  }
}

export interface ScaffoldOverrides {
  /** Override the templates root — used by tests to point at a fixture. */
  templatesRoot?: string;
  /** `force`-equivalent: allow scaffolding into a non-empty existing dir. */
  force?: boolean;
}

/**
 * Orchestrate copy → render → env → install → git against a `ResolvedOptions`.
 * Steps are individually exported so tests can drive them in isolation; this
 * function is the end-to-end path `main()` calls.
 */
export async function scaffold(
  opts: ResolvedOptions,
  overrides: ScaffoldOverrides = {},
): Promise<void> {
  const templatesRoot = overrides.templatesRoot ?? resolveTemplatesRoot();
  const templateSrc = path.join(templatesRoot, opts.template);

  if (!fs.existsSync(templateSrc)) {
    throw new Error(
      `Template '${opts.template}' not yet shipped — run Wave 3 plans (12-04..12-07).`,
    );
  }

  // mkdir / non-empty guard
  if (fs.existsSync(opts.projectDir)) {
    if (!overrides.force && !(await dirIsEmpty(opts.projectDir))) {
      throw new Error(
        `Target directory ${opts.projectDir} is not empty. Re-run with --force to overwrite.`,
      );
    }
  } else {
    await fsp.mkdir(opts.projectDir, { recursive: true });
  }

  const vars: TemplateVars = {
    name: opts.name,
    pkgManager: opts.pm,
    year: String(new Date().getFullYear()),
  };

  // 1. copy
  const copySpinner = p.spinner();
  copySpinner.start('Copying template files');
  await copyTemplate(templateSrc, opts.projectDir);
  copySpinner.stop('Template files copied');

  // 2. render
  await renderProjectFiles(opts.projectDir, vars);

  // 3. env.local (only if the template didn't ship one)
  await writeEnvLocal(opts.projectDir);

  // 4. install deps
  if (opts.install) {
    const label = `Installing dependencies with ${opts.pm}`;
    process.stdout.write(`\n${pc.cyan('›')} ${label}\n`);
    try {
      await installDeps(opts.projectDir, opts.pm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `${pc.yellow('!')} Dependency install failed (${pc.dim(msg.split('\n')[0] ?? '')}). ` +
          `You can run \`${opts.pm} install\` manually inside ${opts.name}.\n`,
      );
    }
  }

  // 5. git init (soft-fails internally)
  if (opts.gitInit) {
    const gitSpinner = p.spinner();
    gitSpinner.start('Initialising git repository');
    await initGit(opts.projectDir);
    gitSpinner.stop('Git repository ready');
  }

  // 6. next steps
  const rel = path.relative(process.cwd(), opts.projectDir) || opts.name;
  const lines = [
    '',
    `${pc.green('✓')} ${pc.bold(opts.name)} ready at ${pc.cyan(rel)}`,
    '',
    `${pc.bold('Next steps')}`,
    `  cd ${rel}`,
    ...(opts.install ? [] : [`  ${opts.pm} install`]),
    `  ${opts.pm} run dev`,
    '',
    `${pc.dim('Docs: https://uploadkit.dev')}`,
    '',
  ];
  process.stdout.write(lines.join('\n'));
}
