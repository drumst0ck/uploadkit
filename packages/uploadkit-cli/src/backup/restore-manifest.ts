import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BackupManifest } from './types.js';

const BACKUP_ROOT_DIR = '.uploadkit-backup';

/**
 * Lists all backup sessions under `<root>/.uploadkit-backup/`, parses each
 * `manifest.json`, and returns the manifests sorted by `timestamp`
 * descending (newest first). Consumed by the `restore` subcommand (plan
 * 12.5-07) to present a picker.
 *
 * Returns `[]` if the backup root doesn't exist.
 * Silently skips directories without a readable `manifest.json`.
 */
export async function readManifests(root: string): Promise<BackupManifest[]> {
  const backupRoot = join(resolve(root), BACKUP_ROOT_DIR);
  if (!existsSync(backupRoot)) return [];

  const dirents = await readdir(backupRoot, { withFileTypes: true });
  const manifests: BackupManifest[] = [];
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const manifestPath = join(backupRoot, d.name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const st = await stat(manifestPath);
      if (!st.isFile()) continue;
      const raw = await readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as BackupManifest;
      if (typeof parsed.timestamp !== 'string' || !Array.isArray(parsed.entries)) continue;
      manifests.push(parsed);
    } catch {
      // Skip unreadable / malformed manifests — better than failing restore.
    }
  }

  manifests.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
  return manifests;
}
