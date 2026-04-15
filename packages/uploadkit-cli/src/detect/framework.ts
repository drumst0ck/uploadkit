import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, parse as parsePath, resolve } from 'node:path';

import type { DetectionResult, Framework } from './types.js';
import { detectPackageManager } from './package-manager.js';

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Walk up from `cwd` until we find a `package.json`. Returns `null` when we
 * reach the filesystem root without finding one.
 */
function findPackageRoot(cwd: string): string | null {
  let current = resolve(cwd);
  const { root } = parsePath(current);
  while (true) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      try {
        if (statSync(candidate).isFile()) return current;
      } catch {
        // fall through to walking up
      }
    }
    if (current === root) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readPackageJson(root: string): PackageJsonLike {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJsonLike;
  } catch {
    return {};
  }
}

function mergedDeps(pkg: PackageJsonLike): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}

function hasAny(deps: Record<string, string>, names: string[]): boolean {
  return names.some((n) => Object.prototype.hasOwnProperty.call(deps, n));
}

function hasPrefix(deps: Record<string, string>, prefix: string): boolean {
  return Object.keys(deps).some((k) => k.startsWith(prefix));
}

function fileOrDirExists(root: string, ...candidates: string[]): boolean {
  return candidates.some((rel) => existsSync(join(root, rel)));
}

function hasAppDir(root: string): boolean {
  return (
    fileOrDirExists(root, 'app') ||
    fileOrDirExists(root, 'src/app')
  );
}

function hasPagesApp(root: string): boolean {
  const candidates = [
    'pages/_app.tsx',
    'pages/_app.jsx',
    'pages/_app.ts',
    'pages/_app.js',
    'src/pages/_app.tsx',
    'src/pages/_app.jsx',
    'src/pages/_app.ts',
    'src/pages/_app.js',
  ];
  return candidates.some((rel) => existsSync(join(root, rel)));
}

/**
 * Detect the framework used by the project at (or above) `cwd`.
 *
 * Rules (first match wins — see D-04):
 * 1. `next` + an `app/` directory → `next-app`
 * 2. `next` + a `pages/_app.*` → `next-pages` (refused, App Router required)
 * 3. `@sveltejs/kit` → `sveltekit`
 * 4. `@remix-run/*` or `@react-router/dev` → `remix`
 * 5. `vite` + `react` → `vite-react`
 * 6. otherwise → `unknown`
 *
 * When `framework` is `next-pages` or `unknown` the result includes a
 * human-readable `reason` string.
 */
export function detectFramework(cwd: string = process.cwd()): DetectionResult {
  const resolvedCwd = resolve(cwd);
  const root = findPackageRoot(resolvedCwd) ?? resolvedCwd;
  const pkg = readPackageJson(root);
  const deps = mergedDeps(pkg);
  const packageManager = detectPackageManager(root);

  const hasNext = hasAny(deps, ['next']);
  const hasSvelteKit = hasAny(deps, ['@sveltejs/kit']);
  const hasRemix = hasPrefix(deps, '@remix-run/') || hasAny(deps, ['@react-router/dev']);
  const hasVite = hasAny(deps, ['vite']);
  const hasReact = hasAny(deps, ['react']);

  if (hasNext) {
    const appDir = hasAppDir(root);
    const pagesApp = hasPagesApp(root);
    if (appDir && !pagesApp) {
      return { framework: 'next-app', root, packageManager };
    }
    if (pagesApp && !appDir) {
      return {
        framework: 'next-pages',
        root,
        packageManager,
        reason: 'Pages Router not supported — migrate to App Router',
      };
    }
    if (appDir && pagesApp) {
      // Mixed layout — App Router wins per D-04 (App Router is the supported path).
      return { framework: 'next-app', root, packageManager };
    }
    // Next.js declared but no `app/` or `pages/_app.*` on disk.
    return {
      framework: 'unknown',
      root,
      packageManager,
      reason:
        'Next.js detected in dependencies, but neither `app/` nor `pages/_app.*` was found. Run `uploadkit init` from the project root.',
    };
  }

  if (hasSvelteKit) {
    return { framework: 'sveltekit', root, packageManager };
  }

  if (hasRemix) {
    return { framework: 'remix', root, packageManager };
  }

  if (hasVite && hasReact) {
    return { framework: 'vite-react', root, packageManager };
  }

  const missing: string[] = [];
  if (!hasNext) missing.push('next');
  if (!hasSvelteKit) missing.push('@sveltejs/kit');
  if (!hasRemix) missing.push('@remix-run/* or @react-router/dev');
  if (!hasVite) missing.push('vite');
  if (!hasReact) missing.push('react');

  const verdict: Framework = 'unknown';
  return {
    framework: verdict,
    root,
    packageManager,
    reason: `No supported framework detected. Expected one of: ${missing.join(', ')}.`,
  };
}
