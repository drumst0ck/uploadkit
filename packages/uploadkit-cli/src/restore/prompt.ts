import * as p from '@clack/prompts';
import type { BackupManifest } from '../backup/types.js';

/**
 * Prompt the user to pick one backup session from a list of manifests. The
 * input is expected to be sorted newest-first (as `readManifests` returns).
 *
 * Returns the selected manifest, or `null` when the user cancels.
 */
export async function pickSession(
  manifests: BackupManifest[],
): Promise<BackupManifest | null> {
  if (manifests.length === 0) return null;

  const picked = await p.select<string>({
    message: 'Pick a backup session to restore:',
    options: manifests.map((m) => ({
      value: m.timestamp,
      label: `${m.timestamp} (${m.entries.length} file${m.entries.length === 1 ? '' : 's'})`,
    })),
  });
  if (p.isCancel(picked)) return null;
  return manifests.find((m) => m.timestamp === picked) ?? null;
}
