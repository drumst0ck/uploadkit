/**
 * Shape of the backup manifest written to
 * `<root>/.uploadkit-backup/<timestamp>/manifest.json`.
 *
 * One manifest per `init` / `add` invocation. Consumed by the `restore`
 * subcommand (plan 12.5-07) to roll back all changes from a single run.
 */
export interface BackupManifestEntry {
  /** What the CLI did to this file. */
  action: 'modify' | 'create';
  /** Path relative to `root`, using OS-native separators. */
  relativePath: string;
  /**
   * Path to the pre-change copy inside the session dir, relative to the
   * session dir. Present only when `action === 'modify'`.
   */
  backupPath?: string;
}

export interface BackupManifest {
  /** ISO-8601 timestamp (or filesystem-safe variant). Also the session dir name. */
  timestamp: string;
  /** Absolute repo root the session targets. */
  root: string;
  /** All file actions in insertion order. */
  entries: BackupManifestEntry[];
}
