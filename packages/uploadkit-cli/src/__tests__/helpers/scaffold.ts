import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

/**
 * Fixture projects live at `packages/uploadkit-cli/src/__fixtures__/projects/`
 * and are intentionally minimal — just enough files for framework detection
 * plus the canonical insertion targets (layout/root/main). The e2e suite
 * copies each fixture into a fresh tmpdir per test so runs are hermetic.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = resolve(HERE, '..', '..', '__fixtures__', 'projects');

/** Absolute path to the compiled CLI bin that e2e tests spawn. */
export const CLI_BIN = resolve(HERE, '..', '..', '..', 'dist', 'index.js');

export type FixtureName = 'next-app' | 'sveltekit' | 'remix' | 'vite-react';

export interface Scaffolded {
  /** Absolute path to the tmpdir copy of the fixture. */
  root: string;
  /** Remove the tmpdir. Best-effort; swallows errors. */
  cleanup: () => void;
}

/**
 * Copy a fixture project into a fresh tmpdir. Caller MUST call `cleanup()` in
 * an `afterEach` / `finally`. We intentionally use sync FS so setup/teardown
 * never races with the CLI child process.
 */
export function scaffold(fixture: FixtureName): Scaffolded {
  const src = join(FIXTURES_DIR, fixture);
  if (!existsSync(src)) {
    throw new Error(`Fixture "${fixture}" not found at ${src}`);
  }
  const root = mkdtempSync(join(tmpdir(), `uploadkit-e2e-${fixture}-`));
  cpSync(src, root, { recursive: true });
  return {
    root,
    cleanup: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // swallow — tmpdir will be GC'd by the OS regardless.
      }
    },
  };
}

export interface RunCliOptions {
  /** Working directory for the child process. Required — prevents accidents. */
  cwd: string;
  /** Extra env on top of `process.env`. `CI=1` + SKIP_MAIN override are forced. */
  env?: NodeJS.ProcessEnv;
  /** Milliseconds before the child is killed. Default 30_000. */
  timeout?: number;
}

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn the compiled CLI bin via `node dist/index.js <args>` in a child
 * process. We deliberately do NOT use `--import`/loader tricks: the e2e
 * suite's whole point is to exercise the shipped bin exactly as `npx` will.
 */
export async function runCli(args: string[], opts: RunCliOptions): Promise<CliResult> {
  if (!existsSync(CLI_BIN)) {
    throw new Error(
      `CLI not built. Expected ${CLI_BIN}. Run \`pnpm --filter uploadkit build\` first (vitest globalSetup builds it automatically).`,
    );
  }
  // NB: we deliberately don't annotate `proc` — execa's ResultPromise is
  // parameterised by the exact Options object passed in, and with
  // `exactOptionalPropertyTypes: true` the narrower inferred type isn't
  // assignable to the unparameterised alias. Letting TS infer keeps the
  // types sound without leaking execa's generics into this helper's surface.
  const proc = execa('node', [CLI_BIN, ...args], {
    cwd: opts.cwd,
    env: {
      ...process.env,
      CI: '1',
      // Guard: ensure no accidental auto-run of dist/index.js's top-level
      // main() loop. dist reads process.argv, not this variable, so it's
      // already safe — kept here as a safety comment for future refactors.
      ...(opts.env ?? {}),
    },
    timeout: opts.timeout ?? 30_000,
    reject: false,
  });
  const result = await proc;
  return {
    exitCode: typeof result.exitCode === 'number' ? result.exitCode : 1,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  };
}
