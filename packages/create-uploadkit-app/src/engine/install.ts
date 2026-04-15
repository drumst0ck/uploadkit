import { execa } from 'execa';
import type { PackageManager } from '../types.js';

/**
 * Return the argv for running a dependency install in `dir` with `pm`.
 * - pnpm / npm / bun → `<bin> install`
 * - yarn             → bare `yarn` (adding `install` is a no-op but idiomatic yarn is bare)
 */
function installCommand(pm: PackageManager): { bin: string; args: string[] } {
  switch (pm) {
    case 'pnpm':
      return { bin: 'pnpm', args: ['install'] };
    case 'npm':
      return { bin: 'npm', args: ['install'] };
    case 'yarn':
      return { bin: 'yarn', args: [] };
    case 'bun':
      return { bin: 'bun', args: ['install'] };
  }
}

/**
 * Run `<pm> install` in the project directory, inheriting stdio so the user
 * sees the PM's live output. Throws on non-zero exit so the orchestrator can
 * surface a clear error message.
 */
export async function installDeps(dir: string, pm: PackageManager): Promise<void> {
  const { bin, args } = installCommand(pm);
  await execa(bin, args, { cwd: dir, stdio: 'inherit' });
}
