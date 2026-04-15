import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

/**
 * Vitest globalSetup: make sure `dist/index.js` exists and is newer than the
 * latest source file before any e2e test runs. Unit tests import from src
 * directly and don't care, but the e2e suite spawns the compiled bin.
 *
 * We bias toward "build once, reuse" — a developer iterating on tests
 * shouldn't pay the tsup cost on every invocation if dist is already fresh.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..', '..', '..');
const DIST = resolve(PKG_ROOT, 'dist', 'index.js');
const SRC = resolve(PKG_ROOT, 'src');

function newestMtime(dir: string): number {
  // Cheap glob-free walk — only scanning src/ which is small.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  let max = 0;
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip test helper + fixture dirs — they don't affect dist output.
        if (entry.name === '__tests__' || entry.name === '__fixtures__') continue;
        stack.push(full);
      } else {
        const m = fs.statSync(full).mtimeMs;
        if (m > max) max = m;
      }
    }
  }
  return max;
}

export default async function setup(): Promise<void> {
  const needBuild =
    !existsSync(DIST) ||
    statSync(DIST).mtimeMs < newestMtime(SRC);

  if (!needBuild) return;

  await execa('pnpm', ['build'], {
    cwd: PKG_ROOT,
    stdio: 'inherit',
    // tsup is fast but give CI headroom.
    timeout: 120_000,
  });

  if (!existsSync(DIST)) {
    throw new Error(`Build completed but ${DIST} is missing.`);
  }
}
