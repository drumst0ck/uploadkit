import { lstat, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BackupManifest } from '../backup/types.js';
import { assertRealContainment, containedPath } from './paths.js';

/** Prepare --latest archiving without changing the filesystem. Must run before
 * applyRestore: a known unsafe archive must not leave a partially restored app.
 * These checks do not make subsequent filesystem operations atomic. */
export async function preflightArchive(
  manifest: BackupManifest,
  projectRoot: string,
): Promise<{ from: string; to: string }> {
  try {
    const root = resolve(projectRoot);
    if (resolve(manifest.root) !== root) throw new Error('Restore archive root does not match the project');
    const backupRoot = containedPath(root, '.uploadkit-backup');
    const from = containedPath(backupRoot, manifest.timestamp);
    const to = containedPath(backupRoot, join('.applied', manifest.timestamp));
    await assertRealContainment(root, backupRoot);
    await assertRealContainment(root, from);
    await assertRealContainment(root, to);
    await assertRealContainment(backupRoot, from);
    await assertRealContainment(backupRoot, to);
    if (!(await stat(from)).isDirectory()) throw new Error('Restore archive source is not a directory');
    const destination = await lstat(to).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (destination) throw new Error('Restore archive destination already exists');
    return { from, to };
  } catch (error) {
    throw new Error(`Unsafe restore archive path: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}
