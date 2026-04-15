import { execa } from 'execa';
import type { PackageManager } from '../detect/types.js';

export interface InstallPackagesOptions {
  /** When true, do not spawn the PM — useful for tests and --skip-install. */
  skipInstall?: boolean;
}

/**
 * Per-PM subcommand used to add runtime dependencies. Values chosen to match
 * each PM's native ergonomics (pnpm/yarn/bun `add`, npm `install`).
 */
const ADD_SUBCOMMAND: Record<PackageManager, string> = {
  pnpm: 'add',
  yarn: 'add',
  bun: 'add',
  npm: 'install',
};

/**
 * Install the given package specifiers into `root` using the detected
 * package manager. Streams the PM's stdout/stderr so the user sees progress.
 *
 * - `pkgs` is passed verbatim (callers should append `@latest` when they want
 *   a pinned-to-latest install, e.g. `@uploadkitdev/next@latest`).
 * - `skipInstall: true` is a no-op — intended for CI / tests that don't want
 *   to actually hit the network. Returns normally.
 * - Empty `pkgs` list is a no-op.
 * - Non-zero exit from the PM throws (execa already throws on non-zero exit).
 */
export async function installPackages(
  pm: PackageManager,
  root: string,
  pkgs: string[],
  opts: InstallPackagesOptions = {},
): Promise<void> {
  if (opts.skipInstall) return;
  if (pkgs.length === 0) return;

  const sub = ADD_SUBCOMMAND[pm];
  await execa(pm, [sub, ...pkgs], {
    cwd: root,
    stdio: 'inherit',
  });
}
