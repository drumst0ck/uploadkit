import { createHash } from 'node:crypto';
import { chmod, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as p from '@clack/prompts';
import type { BackupManifest } from '../backup/types.js';
import { assertRealContainment, containedPath } from './paths.js';

export interface ApplyRestoreOptions {
  /** Non-interactive mode: skip drift-confirmation prompts. */
  yes?: boolean;
  /**
   * Override the session dir location. Defaults to
   * `<manifest.root>/.uploadkit-backup/<manifest.timestamp>`. Tests may pass
   * an absolute path to point at a fixture layout.
   */
  sessionDir?: string;
}

export interface RestoreResult {
  /** Files copied back from backup (action=modify). */
  restored: string[];
  /** Files deleted because the CLI created them (action=create). */
  deleted: string[];
  /** Files the user skipped via drift prompt, or already in the target state. */
  skipped: string[];
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function readFileSafe(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

/**
 * Replay a backup manifest in reverse to undo the changes the CLI made in a
 * single `init` / `add` run.
 *
 * Algorithm:
 *   - Preflight every path and read every required backup before mutations.
 *   - Iterate entries in REVERSE insertion order using retained backup bytes.
 *   - action="create" → delete the target file (ignore ENOENT).
 *   - action="modify" → compare current file sha256 to backup sha256. If they
 *     differ AND the backup differs from current, the user has modified the
 *     file since backup → prompt to confirm (skip on no). Then copy backup
 *     back over current.
 *
 * Idempotency: re-running the same restore is safe. Created files are already
 * gone (rm with force=true), and modified files that already match their
 * backup are reported as skipped rather than re-copied.
 *
 * Does NOT create a new backup of the pre-restore state — users can recover
 * that from git or a previous backup session. Noted in the summary.
 */
export async function applyRestore(
  manifest: BackupManifest,
  opts: ApplyRestoreOptions = {},
): Promise<RestoreResult> {
  const { yes = false } = opts;
  const root = resolve(manifest.root);
  const backupRoot = join(root, '.uploadkit-backup');
  const sessionDir = opts.sessionDir ?? containedPath(backupRoot, manifest.timestamp);
  if (!opts.sessionDir) await assertRealContainment(root, sessionDir);

  // Validate the entire plan and retain backup contents before performing even
  // the first mutation. A later missing/unreadable backup must not leave earlier
  // reverse-plan entries deleted or overwritten.
  const backups = new Map<number, { bytes: Buffer; mode: number }>();
  for (const [index, entry] of manifest.entries.entries()) {
    if (entry.action !== 'create' && entry.action !== 'modify') {
      throw new Error('Unsafe restore action');
    }
    const target = containedPath(root, entry.relativePath);
    await assertRealContainment(root, target);
    if (entry.backupPath !== undefined) {
      const backup = containedPath(sessionDir, entry.backupPath);
      await assertRealContainment(sessionDir, backup);
    }
    if (entry.action === 'modify') {
      if (!entry.backupPath) {
        throw new Error(`Missing backup path for modified file: ${entry.relativePath}`);
      }
      const backup = containedPath(sessionDir, entry.backupPath);
      try {
        const info = await stat(backup);
        if (!info.isFile()) throw new Error('Backup is not a regular file');
        backups.set(index, { bytes: await readFile(backup), mode: info.mode });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(
            `Backup file is missing: ${backup}. The .uploadkit-backup/${manifest.timestamp}/ directory may have been deleted.`,
            { cause: error },
          );
        }
        throw new Error(`Backup file is unreadable: ${backup}. Restore aborted before changing files.`, {
          cause: error,
        });
      }
    }
  }

  const restored: string[] = [];
  const deleted: string[] = [];
  const skipped: string[] = [];

  // Reverse insertion order: undo creations first, then modifications.
  for (let i = manifest.entries.length - 1; i >= 0; i--) {
    const entry = manifest.entries[i]!;
    const targetAbs = containedPath(root, entry.relativePath);
    await assertRealContainment(root, targetAbs);

    if (entry.action === 'create') {
      // Remove the file the CLI created. If it's already gone, that's fine —
      // supports idempotent re-runs.
      await rm(targetAbs, { force: true });
      deleted.push(targetAbs);
      continue;
    }

    // action === 'modify': use only the bytes read during preflight.
    const backup = backups.get(i)!;
    const backupBytes = backup.bytes;
    const currentBytes = await readFileSafe(targetAbs);

    // If the current file already matches the backup, nothing to do — keeps
    // the operation idempotent (second run = no-op).
    if (currentBytes && sha256(currentBytes) === sha256(backupBytes)) {
      skipped.push(targetAbs);
      continue;
    }

    // Drift detection: if the user modified the file since backup AND the
    // current content differs from the backup, ask before overwriting.
    if (currentBytes && !yes) {
      const confirmed = await p.confirm({
        message: `File changed since backup: ${entry.relativePath}. Overwrite with backup copy?`,
        initialValue: true,
      });
      if (p.isCancel(confirmed) || confirmed === false) {
        skipped.push(targetAbs);
        continue;
      }
    }

    await assertRealContainment(root, targetAbs);
    await mkdir(dirname(targetAbs), { recursive: true });
    await writeFile(targetAbs, backupBytes);
    // Match cp's source-mode preservation without reopening the backup.
    await chmod(targetAbs, backup.mode);
    restored.push(targetAbs);
  }

  return { restored, deleted, skipped };
}
