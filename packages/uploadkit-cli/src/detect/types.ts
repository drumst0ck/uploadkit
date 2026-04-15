/**
 * Shared type surface for the detection module.
 *
 * Consumed by `init`, `add`, and the fixture-driven tests. Keep this file
 * free of runtime imports — it's imported from everywhere.
 */

export type Framework =
  | 'next-app'
  | 'next-pages'
  | 'sveltekit'
  | 'remix'
  | 'vite-react'
  | 'unknown';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface DetectionResult {
  /** The framework verdict. `unknown` or `next-pages` are refusal paths. */
  framework: Framework;
  /** Absolute path to the directory containing the resolved package.json. */
  root: string;
  /** Package manager inferred from lockfiles (then user-agent, then npm). */
  packageManager: PackageManager;
  /** Human-readable reason — populated when the verdict is a refusal. */
  reason?: string;
}
