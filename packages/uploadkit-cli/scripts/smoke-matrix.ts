#!/usr/bin/env tsx
/**
 * End-to-end smoke test for the `uploadkit` CLI (Phase 12.5).
 *
 * For one framework at a time (selected by positional arg), this script:
 *
 *   1. Scaffolds a fresh project in a tmpdir using the framework's OFFICIAL
 *      upstream starter (create-next-app, `sv create`, create-react-router,
 *      create-vite). Non-interactive flags are pinned per framework so the
 *      scaffolders never hang waiting for input.
 *   2. Runs the BUILT uploadkit CLI against the scaffolded project:
 *        node <repo>/packages/uploadkit-cli/dist/index.js init --yes --skip-install
 *   3. Installs deps inside the scaffolded project (`pnpm install
 *      --ignore-workspace --prefer-offline`) to give the wired-in SDK
 *      dependencies a real `node_modules` to resolve against.
 *   4. Runs the scaffolded project's TypeScript check + build. The exact
 *      commands differ per starter (Next/Remix/Vite use `tsc --noEmit` + `build`;
 *      SvelteKit uses `svelte-check` + `build`).
 *   5. Exits non-zero on any failure. CI logs every child-process line.
 *
 * Contract:
 *   pnpm --filter uploadkit smoke -- <framework>
 *     framework ∈ { next-app | sveltekit | remix | vite-react }
 *
 * This script is invoked both locally (by `pnpm --filter uploadkit smoke`)
 * and in CI (by `.github/workflows/uploadkit-cli-smoke.yml`). The workflow
 * runs one leg per matrix entry so any single framework regression produces
 * a targeted red status on a PR.
 *
 * Linux-only by design (D-10). Windows CI deferred.
 */
import { execa, type Options as ExecaOptions } from 'execa';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '..', '..');
const cliEntry = resolve(pkgRoot, 'dist', 'index.js');

type Framework = 'next-app' | 'sveltekit' | 'remix' | 'vite-react';
const FRAMEWORKS: Framework[] = ['next-app', 'sveltekit', 'remix', 'vite-react'];

const PROJECT_NAME = 'demo';

function log(msg: string): void {
  process.stdout.write(`[smoke] ${msg}\n`);
}

async function run(
  file: string,
  args: string[],
  opts: ExecaOptions = {},
): Promise<void> {
  log(`$ ${file} ${args.join(' ')}${opts.cwd ? `  (cwd: ${opts.cwd})` : ''}`);
  try {
    await execa(file, args, {
      stdio: 'inherit',
      // Pinning CI=1 keeps sub-scaffolders in their non-interactive modes and
      // matches what GitHub Actions sets anyway — local runs get identical output.
      env: { ...process.env, CI: '1' },
      ...opts,
    });
  } catch (err: unknown) {
    const e = err as { exitCode?: number; signal?: string };
    const exit = e.exitCode ?? e.signal ?? 'unknown';
    throw new Error(`Command failed (${exit}): ${file} ${args.join(' ')}`);
  }
}

/**
 * Ensure the CLI has been built. The smoke workflow pre-builds uploadkit-cli,
 * but this check keeps `pnpm --filter uploadkit smoke` usable directly from a
 * fresh clone without a separate build step.
 */
async function ensureCliBuilt(): Promise<void> {
  if (existsSync(cliEntry)) return;
  log('dist/index.js missing — running `pnpm --filter uploadkit build`...');
  await run('pnpm', ['--filter', 'uploadkit', 'build'], { cwd: repoRoot });
  if (!existsSync(cliEntry)) {
    throw new Error(`Built CLI still missing at ${cliEntry} after build.`);
  }
}

/**
 * Per-framework scaffold step. Each case runs the OFFICIAL upstream starter
 * with flags pinned for non-interactive execution and skip-install (we run
 * `pnpm install` ourselves after `uploadkit init` so the SDK deps are
 * resolved in the same pass).
 */
async function scaffold(framework: Framework, tmpRoot: string): Promise<string> {
  const projectDir = join(tmpRoot, PROJECT_NAME);
  switch (framework) {
    case 'next-app':
      // `create-next-app` accepts all interactive answers as flags; the
      // `--yes` + explicit flag set keeps output byte-identical between runs.
      await run(
        'npx',
        [
          '--yes',
          'create-next-app@latest',
          PROJECT_NAME,
          '--ts',
          '--app',
          '--no-tailwind',
          '--no-eslint',
          '--no-src-dir',
          '--import-alias',
          '@/*',
          '--use-pnpm',
          '--skip-install',
          '--no-turbopack',
          '--yes',
        ],
        { cwd: tmpRoot },
      );
      break;
    case 'sveltekit':
      // `sv create` is the current SvelteKit scaffolder (replaces the old
      // `create-svelte`). `--template minimal --types ts --no-add-ons
      // --install none` produces the same skeleton the docs recommend without
      // prompts or extra add-on confusion.
      await run(
        'npx',
        [
          '--yes',
          'sv@latest',
          'create',
          PROJECT_NAME,
          '--template',
          'minimal',
          '--types',
          'ts',
          '--no-add-ons',
          '--install',
          'none',
        ],
        { cwd: tmpRoot },
      );
      break;
    case 'remix':
      // React Router 7 (successor to Remix). `create-react-router` is the
      // official scaffolder. `--no-install --no-git --yes` keeps it
      // non-interactive; we install ourselves after `uploadkit init`.
      await run(
        'npx',
        [
          '--yes',
          'create-react-router@latest',
          PROJECT_NAME,
          '--no-install',
          '--no-git',
          '--yes',
        ],
        { cwd: tmpRoot },
      );
      break;
    case 'vite-react':
      // `npm create vite` with `--template react-ts` and the project name as
      // positional arg. No `--skip-install` flag exists — `create-vite` does
      // not install deps automatically, so nothing to skip.
      await run(
        'npm',
        [
          'create',
          'vite@latest',
          PROJECT_NAME,
          '--yes',
          '--',
          '--template',
          'react-ts',
        ],
        { cwd: tmpRoot },
      );
      break;
    default: {
      const never: never = framework;
      throw new Error(`Unknown framework: ${String(never)}`);
    }
  }
  if (!existsSync(projectDir)) {
    throw new Error(`Scaffolder did not produce ${projectDir}`);
  }
  return projectDir;
}

/**
 * Run `uploadkit init` in the freshly scaffolded project. We use
 * `--skip-install` here because the very next step runs a single `pnpm
 * install` that resolves BOTH the starter's deps AND the ones uploadkit just
 * added to `package.json`. Doing both in one install is faster and exercises
 * the "user installs everything in one go" path that real adopters hit.
 */
async function runUploadkitInit(projectDir: string): Promise<void> {
  await run(process.execPath, [cliEntry, 'init', '--yes', '--skip-install'], {
    cwd: projectDir,
  });
}

/**
 * Post-init verification. Installs deps, then typechecks + builds using the
 * commands the starter ships with. `pnpm install --ignore-workspace` prevents
 * the scaffolded project from being adopted into THIS monorepo's workspace
 * (which would resolve `@uploadkitdev/*` from `packages/` and hide publish
 * bugs). We want the CI leg to see the published surface.
 */
async function installAndBuild(framework: Framework, projectDir: string): Promise<void> {
  // `packageManager` field can be missing or pinned to a version not present
  // on the runner. Bypass Corepack's version check so we always use the pnpm
  // that pnpm/action-setup@v4 just installed.
  const env = { COREPACK_ENABLE_STRICT: '0' };

  // SvelteKit's `sync` generates `.svelte-kit/tsconfig.json` (needed by
  // svelte-check) and requires node_modules present first — so install first.
  await run(
    'pnpm',
    ['install', '--ignore-workspace', '--prefer-offline', '--no-frozen-lockfile'],
    { cwd: projectDir, env },
  );

  switch (framework) {
    case 'next-app':
      await run('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: projectDir, env });
      await run('pnpm', ['exec', 'next', 'build'], { cwd: projectDir, env });
      break;
    case 'sveltekit':
      // `svelte-kit sync` materializes the generated types that
      // svelte-check and the build both rely on.
      await run('pnpm', ['exec', 'svelte-kit', 'sync'], { cwd: projectDir, env });
      await run('pnpm', ['exec', 'svelte-check', '--tsconfig', './tsconfig.json'], {
        cwd: projectDir,
        env,
      });
      await run('pnpm', ['exec', 'vite', 'build'], { cwd: projectDir, env });
      break;
    case 'remix':
      await run('pnpm', ['exec', 'react-router', 'typegen'], { cwd: projectDir, env });
      await run('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: projectDir, env });
      await run('pnpm', ['exec', 'react-router', 'build'], { cwd: projectDir, env });
      break;
    case 'vite-react':
      await run('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: projectDir, env });
      await run('pnpm', ['exec', 'vite', 'build'], { cwd: projectDir, env });
      break;
  }
}

/**
 * A harmless placeholder `.env.local` / `.env` with an obviously-test-only
 * API key. The CLI will happily overlay its own keys on top; this just
 * guarantees the scaffolded project never tries to read a missing env at
 * build time if the starter's build has runtime env requirements.
 */
function seedPlaceholderEnv(framework: Framework, projectDir: string): void {
  const content = 'UPLOADKIT_API_KEY=uk_test_placeholder\n';
  const filename = framework === 'sveltekit' ? '.env' : '.env.local';
  writeFileSync(join(projectDir, filename), content);
}

async function smokeOne(framework: Framework): Promise<void> {
  const t0 = Date.now();
  const tmpRoot = mkdtempSync(join(tmpdir(), `uploadkit-cli-smoke-${framework}-`));
  log(`[${framework}] tmp root: ${tmpRoot}`);
  try {
    const projectDir = await scaffold(framework, tmpRoot);
    seedPlaceholderEnv(framework, projectDir);
    await runUploadkitInit(projectDir);
    await installAndBuild(framework, projectDir);
    const ms = Date.now() - t0;
    log(`[${framework}] OK in ${Math.round(ms / 1000)}s`);
  } finally {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

async function main(): Promise<void> {
  const [, , rawFramework] = process.argv;
  if (!rawFramework) {
    process.stderr.write(
      `Usage: pnpm --filter uploadkit smoke -- <framework>\n  framework: ${FRAMEWORKS.join(' | ')}\n`,
    );
    process.exit(2);
  }
  if (!(FRAMEWORKS as readonly string[]).includes(rawFramework)) {
    process.stderr.write(`Unknown framework "${rawFramework}". Expected one of ${FRAMEWORKS.join(', ')}.\n`);
    process.exit(2);
  }
  await ensureCliBuilt();
  await smokeOne(rawFramework as Framework);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[smoke] fatal: ${msg}\n`);
  process.exit(1);
});
