#!/usr/bin/env node
/**
 * End-to-end smoke test for create-uploadkit-app.
 *
 * 1. `pnpm --filter create-uploadkit-app build`
 * 2. `pnpm --filter create-uploadkit-app pack` (produces a tarball)
 * 3. For each template [next, sveltekit, remix, vite]:
 *      a. Scaffold into os.tmpdir()/cka-smoke-<rand>/<template>
 *      b. `pnpm install --prefer-offline`
 *      c. `pnpm build`
 *      d. Time the scaffold step; fail if >90s
 * 4. Print a summary table, exit non-zero on any failure.
 *
 * Designed for CI (Linux + Windows) and local runs.
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '..', '..');

const TEMPLATES = ['next', 'sveltekit', 'remix', 'vite'];
const MAX_SCAFFOLD_MS = 90_000;

function log(msg) {
  process.stdout.write(`[smoke] ${msg}\n`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: opts.silent ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (res.status !== 0) {
    const out = opts.silent
      ? `\n${res.stdout?.toString() || ''}\n${res.stderr?.toString() || ''}`
      : '';
    throw new Error(`Command failed (${res.status}): ${cmd} ${args.join(' ')}${out}`);
  }
  return res;
}

function packCli() {
  log('Building create-uploadkit-app...');
  run('pnpm', ['--filter', 'create-uploadkit-app', 'build'], { cwd: repoRoot });

  log('Packing create-uploadkit-app tarball...');
  const out = execSync('pnpm pack --pack-destination .', {
    cwd: pkgRoot,
    encoding: 'utf8',
  });
  // `pnpm pack` prints the path on the last non-empty line.
  const lines = out.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1];
  const tarball = resolve(pkgRoot, last);
  if (!existsSync(tarball)) {
    // Fallback: find the most recent .tgz in pkgRoot.
    const tgz = readdirSync(pkgRoot)
      .filter((f) => f.endsWith('.tgz'))
      .map((f) => ({ f, t: statSync(join(pkgRoot, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0];
    if (!tgz) throw new Error(`Could not locate packed tarball. pnpm pack output:\n${out}`);
    return resolve(pkgRoot, tgz.f);
  }
  return tarball;
}

function scaffoldAndBuild(tarball, template) {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'cka-smoke-'));
  const projectDir = join(tmpRoot, 'demo');
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
    // Install the tarball globally-like via npx with --yes and a clean cache?
    // Simpler: run the CLI from the tarball directly through `npx`.
    run(
      'npx',
      [
        '--yes',
        tarball,
        projectDir,
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
    run('pnpm', ['install', '--prefer-offline', '--ignore-workspace'], { cwd: projectDir });
    result.installMs = Date.now() - t1;

    log(`[${template}] pnpm build...`);
    const t2 = Date.now();
    run('pnpm', ['build'], { cwd: projectDir });
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

function main() {
  const tarball = packCli();
  log(`Tarball: ${tarball}`);

  const results = [];
  for (const template of TEMPLATES) {
    results.push(scaffoldAndBuild(tarball, template));
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

  // Clean tarball
  try {
    rmSync(tarball, { force: true });
  } catch {
    /* best-effort */
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    log(`\n${failed.length}/${results.length} templates failed.`);
    process.exit(1);
  }
  log(`\nAll ${results.length} templates passed.`);
}

main();
