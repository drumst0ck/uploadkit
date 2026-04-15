import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Directories we never copy into a scaffolded project. These appear in
 * templates only as local-dev artefacts (build output, PM caches, framework
 * generated dirs) and must not leak into the published template payload or
 * into the user's new project.
 */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.svelte-kit',
  'build',
  '.react-router',
]);

/**
 * npm strips leading-dot files when publishing unless you ship them as
 * `_gitignore` / `_env` / `_env.local` etc. At copy time we rename them
 * back to their real dot-prefixed names.
 */
const FILE_RENAMES = new Map<string, string>([
  ['_gitignore', '.gitignore'],
  ['_npmignore', '.npmignore'],
  ['_env', '.env'],
  ['_env.local', '.env.local'],
  ['_env.example', '.env.example'],
]);

function destName(name: string): string {
  return FILE_RENAMES.get(name) ?? name;
}

/**
 * Recursively copy `src` into `dest`. Directories listed in `SKIP_DIRS` are
 * pruned; files matching `FILE_RENAMES` are renamed on write so npm-stripped
 * dot-files (`_gitignore`, `_env.local`, ...) land in the output with their
 * canonical dotted name.
 */
export async function copyTemplate(src: string, dest: string): Promise<void> {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, destName(entry.name));

    if (entry.isDirectory()) {
      await copyTemplate(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const target = await fsp.readlink(srcPath);
      await fsp.symlink(target, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}
