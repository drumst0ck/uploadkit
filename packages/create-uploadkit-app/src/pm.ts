import { PACKAGE_MANAGERS, type PackageManager } from './types.js';

export { PACKAGE_MANAGERS };
export type { PackageManager };

/**
 * Detect the package manager that invoked this CLI.
 *
 * npm/pnpm/yarn/bun all set `npm_config_user_agent` when running their
 * `create-*` shortcut. The first whitespace-delimited token of the UA
 * string is `<pm-name>/<version>`.
 *
 * Fallback order when detection fails: pnpm (matches monorepo convention,
 * see D-05 in CONTEXT.md).
 */
export function detectPm(): PackageManager {
  const ua = process.env.npm_config_user_agent;
  if (!ua) return 'pnpm';

  const token = ua.split(' ')[0] ?? '';
  const name = token.split('/')[0]?.toLowerCase();

  if (name === 'pnpm' || name === 'yarn' || name === 'bun' || name === 'npm') {
    return name;
  }

  return 'pnpm';
}
