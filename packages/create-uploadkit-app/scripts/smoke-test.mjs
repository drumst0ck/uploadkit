#!/usr/bin/env node
/**
 * End-to-end smoke test for create-uploadkit-app.
 *
 * 1. `pnpm --filter create-uploadkit-app build`
 * 2. For each template [next, sveltekit, remix, vite]:
 *      a. Scaffold into os.tmpdir()/cka-smoke-<rand>/demo by running the built
 *         CLI directly: `node packages/create-uploadkit-app/dist/index.js ...`
 *      b. `pnpm install --prefer-offline --ignore-workspace`
 *      c. `pnpm build`
 *      d. Time the scaffold step; fail if >90s
 * 3. Print a summary table, exit non-zero on any failure.
 *
 * Designed for CI (Linux + Windows) and local runs.
 *
 * Why direct `node dist/index.js` instead of `npx <tarball>`?
 *   - On Linux, spawning `npx --yes <tarball>` was being interpreted by the
 *     child shell as if the .tgz file itself was the executable, producing
 *     `sh: 1: /path/to/.tgz: Permission denied`.
 *   - Direct invocation is faster, simpler, and still exercises the full
 *     scaffold path. Tarball/packaging validation should live in a separate
 *     `npm pack --dry-run` check.
 */
import { execa } from 'execa';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '..', '..');
const cliEntry = resolve(pkgRoot, 'dist', 'index.js');

const TEMPLATES = ['next', 'sveltekit', 'remix', 'vite'];
const MAX_SCAFFOLD_MS = 90_000;

function log(msg) {
  process.stdout.write(`[smoke] ${msg}\n`);
}

/**
 * Cross-platform command runner.
 * Uses `execa` (which transparently resolves `.cmd`/`.ps1` shims on Windows
 * and never relies on `shell: true`) so we get reliable exit codes on every OS.
 */
async function run(file, args, opts = {}) {
  try {
    return await execa(file, args, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      ...opts,
    });
  } catch (err) {
    const exit = err.exitCode ?? err.signal ?? 'unknown';
    const out = opts.silent ? `\n${err.stdout || ''}\n${err.stderr || ''}` : '';
    throw new Error(`Command failed (${exit}): ${file} ${args.join(' ')}${out}`);
  }
}

async function buildCli() {
  log('Building create-uploadkit-app...');
  await run('pnpm', ['--filter', 'create-uploadkit-app', 'build'], { cwd: repoRoot });
  if (!existsSync(cliEntry)) {
    throw new Error(`Built CLI not found at ${cliEntry}. Did tsup fail?`);
  }
  return cliEntry;
}

async function scaffoldAndBuild(template) {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'cka-smoke-'));
  // The CLI resolves the positional arg as a *project name* against `cwd`
  // (see prompts.ts → `path.resolve(process.cwd(), sanitized)`), so we pass
  // a bare name and rely on `cwd: tmpRoot` to control where it lands.
  const projectName = 'demo';
  const projectDir = join(tmpRoot, projectName);
  const result = {
    template,
    scaffoldMs: 0,
    installMs: 0,
    buildMs: 0,
    ok: false,
    error: null,
  };

  try {
    log(`[${template}] Scaffolding into ${projectDir}...`);
    const t0 = Date.now();
    await run(
      process.execPath,
      [
        cliEntry,
        projectName,
        '--template',
        template,
        '--pm',
        'pnpm',
        '--yes',
        '--no-git',
        '--no-install',
      ],
      { cwd: tmpRoot },
    );
    result.scaffoldMs = Date.now() - t0;
    if (result.scaffoldMs > MAX_SCAFFOLD_MS) {
      throw new Error(
        `Scaffold took ${result.scaffoldMs}ms, exceeds ${MAX_SCAFFOLD_MS}ms budget`,
      );
    }

    log(`[${template}] pnpm install...`);
    const t1 = Date.now();
    await run('pnpm', ['install', '--prefer-offline', '--ignore-workspace'], {
      cwd: projectDir,
    });
    result.installMs = Date.now() - t1;

    log(`[${template}] pnpm build...`);
    const t2 = Date.now();
    await run('pnpm', ['build'], { cwd: projectDir });
    result.buildMs = Date.now() - t2;

    result.ok = true;
  } catch (err) {
    result.error = err.message;
  } finally {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }

  return result;
}

async function main() {
  await buildCli();
  log(`CLI entry: ${cliEntry}`);

  const results = [];
  for (const template of TEMPLATES) {
    results.push(await scaffoldAndBuild(template));
  }

  // Summary
  log('\n=== Smoke test summary ===');
  const rows = [['template', 'scaffold(ms)', 'install(ms)', 'build(ms)', 'ok']];
  for (const r of results) {
    rows.push([
      r.template,
      String(r.scaffoldMs),
      String(r.installMs),
      String(r.buildMs),
      r.ok ? 'PASS' : `FAIL: ${r.error}`,
    ]);
  }
  for (const row of rows) {
    process.stdout.write(row.join('\t') + '\n');
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    log(`\n${failed.length}/${results.length} templates failed.`);
    process.exit(1);
  }
  log(`\nAll ${results.length} templates passed.`);
}

main().catch((err) => {
  process.stderr.write(`[smoke] fatal: ${err.message}\n`);
  process.exit(1);
});
