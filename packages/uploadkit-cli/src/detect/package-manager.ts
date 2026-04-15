import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PackageManager } from './types.js';

/**
 * Detect the package manager used by the project rooted at `cwd`.
 *
 * Priority (D-04, adapted from `create-uploadkit-app/src/pm.ts`):
 * 1. Lockfiles — `pnpm-lock.yaml` → pnpm, `bun.lock*` → bun,
 *    `yarn.lock` → yarn, `package-lock.json` → npm.
 * 2. `process.env.npm_config_user_agent` — tokens like `pnpm/8.x …`.
 * 3. Fallback: `npm`.
 *
 * This function is pure aside from filesystem reads — no network, no spawn.
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  const root = resolve(cwd);

  if (existsSync(`${root}/pnpm-lock.yaml`)) return 'pnpm';

  // bun emits `bun.lock` (text) or `bun.lockb` (binary). Scan the dir once
  // for any `bun.lock*` entry rather than stat'ing each candidate.
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    entries = [];
  }
  if (entries.some((name) => name === 'bun.lock' || name === 'bun.lockb')) {
    return 'bun';
  }

  if (existsSync(`${root}/yarn.lock`)) return 'yarn';
  if (existsSync(`${root}/package-lock.json`)) return 'npm';

  const ua = process.env.npm_config_user_agent;
  if (ua) {
    const token = ua.split(' ')[0] ?? '';
    const name = token.split('/')[0]?.toLowerCase();
    if (name === 'pnpm' || name === 'yarn' || name === 'bun' || name === 'npm') {
      return name;
    }
  }

  return 'npm';
}
