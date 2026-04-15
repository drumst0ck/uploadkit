import { existsSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import fg from 'fast-glob';
import * as p from '@clack/prompts';
import type { Framework } from '../detect/types.js';

/**
 * Glob patterns used to list candidate target files per React framework.
 * These are the files users typically want to drop a component into.
 *
 * Not every candidate must exist — fast-glob simply ignores misses.
 */
const CANDIDATE_GLOBS: Partial<Record<Framework, string[]>> = {
  'next-app': [
    'app/**/page.tsx',
    'app/**/page.jsx',
    'src/app/**/page.tsx',
    'src/app/**/page.jsx',
  ],
  remix: [
    'app/routes/**/*.tsx',
    'app/routes/**/*.jsx',
  ],
  'vite-react': [
    'src/**/*.tsx',
    'src/**/*.jsx',
  ],
};

/**
 * Patterns that should never be offered as a target even if they match the
 * globs above (entry points users rarely want the component in directly,
 * test files, declarations).
 */
const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.svelte-kit/**',
  '**/main.tsx',
  '**/main.jsx',
  '**/*.d.ts',
  '**/*.test.tsx',
  '**/*.test.jsx',
  '**/*.spec.tsx',
  '**/*.spec.jsx',
];

export interface PromptTargetOptions {
  /** Absolute project root. */
  root: string;
  /** Detection verdict — selects the candidate globs. */
  framework: Framework;
  /** Optional explicit `--target` path (absolute or root-relative). */
  targetFlag: string | undefined;
  /** Non-interactive mode: `--yes` short-circuits prompt errors. */
  yes?: boolean;
}

/**
 * Resolves the target file for `uploadkit add <component>`.
 *
 * Flow:
 * 1. If `targetFlag` is provided, validate path exists + has .tsx/.jsx
 *    extension; return absolute path.
 * 2. Otherwise list candidates via `fast-glob` against framework-specific
 *    globs and prompt the user via `@clack/prompts select`.
 * 3. If the glob yields zero hits, fall back to a text prompt asking for
 *    a path. `--yes` turns that fallback into a hard error (no prompt).
 *
 * Returns the absolute file path, or `null` when the user cancels.
 */
export async function promptForTargetFile(opts: PromptTargetOptions): Promise<string | null> {
  const { root, framework, targetFlag, yes } = opts;

  if (targetFlag) {
    const abs = isAbsolute(targetFlag) ? targetFlag : resolve(root, targetFlag);
    if (!existsSync(abs)) {
      throw new Error(`--target path does not exist: ${targetFlag}`);
    }
    if (!statSync(abs).isFile()) {
      throw new Error(`--target must point to a file: ${targetFlag}`);
    }
    if (!/\.[jt]sx$/.test(abs)) {
      throw new Error(`--target must be a .tsx or .jsx file: ${targetFlag}`);
    }
    return abs;
  }

  const globs = CANDIDATE_GLOBS[framework];
  if (!globs) {
    // Defensive — callers should check isAddSupported before reaching here.
    throw new Error(`No candidate globs configured for framework: ${framework}`);
  }

  const matches = await fg(globs, {
    cwd: root,
    absolute: true,
    ignore: IGNORE,
    onlyFiles: true,
    dot: false,
  });

  if (matches.length === 0) {
    if (yes) {
      throw new Error(
        `No candidate .tsx/.jsx files found in ${root} for framework "${framework}". Pass --target <path>.`,
      );
    }
    const manual = await p.text({
      message: 'No candidate files found. Enter the path to the file you want to modify:',
      validate: (v) => {
        if (!v) return 'Path is required';
        if (!/\.[jt]sx$/.test(v)) return 'Must be a .tsx or .jsx file';
        return undefined;
      },
    });
    if (p.isCancel(manual)) return null;
    const abs = isAbsolute(manual) ? manual : resolve(root, manual);
    if (!existsSync(abs)) {
      throw new Error(`Path does not exist: ${manual}`);
    }
    return abs;
  }

  // Sort for deterministic ordering in both tests and UX.
  matches.sort();

  if (yes) {
    // Non-interactive: pick the first candidate deterministically.
    return matches[0]!;
  }

  const picked = await p.select({
    message: 'Pick a file to insert the component into:',
    options: matches.map((abs) => ({
      value: abs,
      label: relative(root, abs),
    })),
  });
  if (p.isCancel(picked)) return null;
  return picked as string;
}

/** Exposed for tests / internal use. */
export const __candidateGlobs = CANDIDATE_GLOBS;
export const __ignoreGlobs = IGNORE;

/** Normalize a path for comparison in tests. */
export function toRelative(root: string, abs: string): string {
  return relative(root, abs).split(/[\\/]/).join('/');
}

/** Used by commands/add.ts to enumerate candidates without prompting. */
export async function listCandidates(root: string, framework: Framework): Promise<string[]> {
  const globs = CANDIDATE_GLOBS[framework];
  if (!globs) return [];
  const results = await fg(globs, {
    cwd: root,
    absolute: true,
    ignore: IGNORE,
    onlyFiles: true,
    dot: false,
  });
  return results.sort();
}

// Keep `join` referenced so tree-shakers don't complain in dev builds; used
// implicitly via `resolve` but future refactors may reach for it.
void join;
