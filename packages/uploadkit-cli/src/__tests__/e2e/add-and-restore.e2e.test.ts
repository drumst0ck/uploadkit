import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { runCli, scaffold, type Scaffolded } from '../helpers/scaffold.js';

/**
 * E2e roundtrip: init → add → restore(add) → restore(init).
 *
 * `restore --yes` auto-picks the most recent session. Since session
 * directories are NOT deleted after replay, chaining two `--yes` calls would
 * pick the same timestamp twice. We list the backup directory ourselves and
 * drive each step via `--timestamp <iso>` for determinism.
 *
 * The TEMPLATE_CANDIDATES path in `src/add/insert-component.ts` is
 * already correct for the bundled layout (tsup emits a single
 * `dist/index.js`, so `MODULE_DIR === dist/` and `resolve(MODULE_DIR,
 * 'add-templates')` resolves to the copied template dir). The FULL
 * ROUNDTRIP case below is still `it.skip`'d pending a separate pass that
 * validates the generated dropzone snippet against the scaffolded
 * fixture's page.tsx layout — unskip once that assertion suite lands.
 */
describe.sequential('e2e: add + restore roundtrip (next-app)', () => {
  let fx: Scaffolded | null = null;

  afterEach(() => {
    fx?.cleanup();
    fx = null;
  });

  function listSessions(root: string): string[] {
    const dir = join(root, '.uploadkit-backup');
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      // Skip the archive-of-applied-sessions subdir — it's an audit trail,
      // not a live session candidate.
      .filter((d) => d.name !== '.applied')
      .map((d) => d.name)
      .sort(); // ISO timestamps sort lexicographically = chronologically.
  }

  /** Best-effort delete; no-op if the path is already absent. */
  function rmSyncMaybe(p: string): void {
    try {
      rmSync(p, { recursive: true, force: true });
    } catch {
      // swallow — absence is fine
    }
  }

  it('init → restore(init) returns the project to a virgin state', async () => {
    fx = scaffold('next-app');
    const { root } = fx;

    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const envPath = join(root, '.env.local');
    const clientPath = join(root, 'lib', 'uploadkit.ts');
    const originalLayout = readFileSync(layoutPath, 'utf8');

    const initRes = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(initRes.exitCode, `stderr:\n${initRes.stderr}`).toBe(0);
    expect(existsSync(routePath)).toBe(true);
    expect(existsSync(envPath)).toBe(true);
    expect(existsSync(clientPath)).toBe(true);
    expect(readFileSync(layoutPath, 'utf8')).not.toBe(originalLayout);

    const sessions = listSessions(root);
    expect(sessions).toHaveLength(1);

    const restoreRes = await runCli(['restore', '--yes'], { cwd: root });
    expect(restoreRes.exitCode, `stderr:\n${restoreRes.stderr}`).toBe(0);

    // Route handler, env, client stub all deleted; layout restored byte-for-byte.
    expect(existsSync(routePath)).toBe(false);
    expect(existsSync(envPath)).toBe(false);
    expect(existsSync(clientPath)).toBe(false);
    expect(readFileSync(layoutPath, 'utf8')).toBe(originalLayout);
  });

  it('restore --latest walks the backup stack in LIFO order', async () => {
    fx = scaffold('next-app');
    const { root } = fx;

    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const envPath = join(root, '.env.local');
    const originalLayout = readFileSync(layoutPath, 'utf8');

    // First session: `init`.
    const initRes = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(initRes.exitCode, `stderr:\n${initRes.stderr}`).toBe(0);
    const afterInitLayout = readFileSync(layoutPath, 'utf8');
    expect(afterInitLayout).not.toBe(originalLayout);

    // Second session: a synthetic "modify the layout again" backup, created
    // by re-running a file mutation + manual session finalize. We emulate
    // this by re-running init on a hand-mutated layout (so init writes a
    // fresh backup of the new layout state). To do that, we first break the
    // idempotency check by removing the route handler and re-running init.
    // After the second init there will be TWO session directories.
    // Simpler: write a sentinel file via `add` would be ideal, but for
    // determinism we just replay init on a slightly-different layout.
    writeFileSync(
      layoutPath,
      `${afterInitLayout}// second-edit-sentinel\n`,
      'utf8',
    );
    // Remove route.ts so idempotency check fails and init runs again,
    // producing a second backup session with a fresh layout snapshot.
    rmSyncMaybe(routePath);
    const layoutBeforeSecondInit = readFileSync(layoutPath, 'utf8');

    const initRes2 = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(initRes2.exitCode, `stderr:\n${initRes2.stderr}`).toBe(0);

    const sessionsAfterTwoInits = listSessions(root);
    expect(sessionsAfterTwoInits).toHaveLength(2);

    // restore --latest (1st call): undoes the SECOND init, so the layout
    // returns to its post-first-init state, with the sentinel intact.
    const r1 = await runCli(['restore', '--latest', '--yes'], { cwd: root });
    expect(r1.exitCode, `stderr:\n${r1.stderr}`).toBe(0);
    expect(readFileSync(layoutPath, 'utf8')).toBe(layoutBeforeSecondInit);

    // The applied session must have been archived, not deleted.
    expect(listSessions(root)).toHaveLength(1);
    const applied = join(root, '.uploadkit-backup', '.applied');
    expect(existsSync(applied)).toBe(true);
    expect(readdirSync(applied).length).toBe(1);

    // restore --latest (2nd call): undoes the FIRST init, returning the
    // layout to its pristine (pre-init) state.
    const r2 = await runCli(['restore', '--latest', '--yes'], { cwd: root });
    expect(r2.exitCode, `stderr:\n${r2.stderr}`).toBe(0);
    expect(readFileSync(layoutPath, 'utf8')).toBe(originalLayout);
    expect(existsSync(routePath)).toBe(false);
    expect(existsSync(envPath)).toBe(false);

    // Both sessions are now in `.applied/`, no active sessions remain.
    expect(listSessions(root)).toHaveLength(0);
    expect(readdirSync(applied).length).toBe(2);
  });

  // Seeded for future execution. The add-template path resolution is
  // already correct; this `it.skip` remains until the assertion suite for
  // the generated dropzone snippet is fleshed out against the fixture's
  // page.tsx. Flip to `it(...)` when that work lands.
  it.skip('init → add dropzone → restore(add) → restore(init) — FULL ROUNDTRIP', async () => {
    fx = scaffold('next-app');
    const { root } = fx;

    const pagePath = join(root, 'app', 'page.tsx');
    mkdirSync(join(root, 'app'), { recursive: true });
    const originalPage =
      'export default function Page() {\n' +
      '  return (\n' +
      '    <main>\n' +
      '      <p>hi</p>\n' +
      '    </main>\n' +
      '  );\n' +
      '}\n';
    writeFileSync(pagePath, originalPage, 'utf8');

    const layoutPath = join(root, 'app', 'layout.tsx');
    const routePath = join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
    const envPath = join(root, '.env.local');
    const originalLayout = readFileSync(layoutPath, 'utf8');

    const initRes = await runCli(['init', '--yes', '--skip-install'], { cwd: root });
    expect(initRes.exitCode).toBe(0);
    const initTs = listSessions(root)[0]!;

    const addRes = await runCli(
      ['add', 'dropzone', '--target', 'app/page.tsx', '--yes'],
      { cwd: root },
    );
    expect(addRes.exitCode, `stderr:\n${addRes.stderr}`).toBe(0);
    const pageAfterAdd = readFileSync(pagePath, 'utf8');
    expect(pageAfterAdd).toContain('UploadDropzone');
    expect(pageAfterAdd).toContain('uploadkit:start — dropzone');

    const sessions = listSessions(root);
    const addTs = sessions.find((ts) => ts !== initTs)!;

    const restoreAdd = await runCli(
      ['restore', '--timestamp', addTs, '--yes'],
      { cwd: root },
    );
    expect(restoreAdd.exitCode).toBe(0);
    expect(readFileSync(pagePath, 'utf8')).toBe(originalPage);
    expect(existsSync(routePath)).toBe(true);

    const restoreInit = await runCli(
      ['restore', '--timestamp', initTs, '--yes'],
      { cwd: root },
    );
    expect(restoreInit.exitCode).toBe(0);
    expect(existsSync(routePath)).toBe(false);
    expect(readFileSync(layoutPath, 'utf8')).toBe(originalLayout);
    expect(existsSync(envPath)).toBe(false);
  });

});
