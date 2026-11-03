import { lstat, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';

function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Validate both native and Windows paths, even when restoring on POSIX. */
export function containedPath(root: string, value: string): string {
  if (typeof value !== 'string' || !value || value.includes('\0') ||
      isAbsolute(value) || win32.isAbsolute(value) || (sep !== '\\' && value.includes('\\'))) {
    throw new Error('Unsafe restore path');
  }
  const target = resolve(root, value);
  if (target === resolve(root) || !isWithin(resolve(root), target)) {
    throw new Error('Restore path is outside its allowed directory');
  }
  return target;
}

/** Resolve the nearest existing ancestor to detect symlink escapes, including
 * when the target or some of its parents do not exist yet. */
async function existingRealPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const entry = await lstat(path).catch((statError: NodeJS.ErrnoException) => {
      if (statError.code !== 'ENOENT') throw statError;
      return null;
    });
    if (entry?.isSymbolicLink()) throw new Error('Unsafe dangling restore symlink', { cause: error });
    const parent = dirname(path);
    if (parent === path) throw error;
    return existingRealPath(parent);
  }
}

export async function assertRealContainment(root: string, target: string): Promise<void> {
  const realRoot = await existingRealPath(resolve(root));
  const realTarget = await existingRealPath(target);
  if (!isWithin(realRoot, realTarget)) {
    throw new Error('Restore path resolves outside its allowed directory');
  }
}
