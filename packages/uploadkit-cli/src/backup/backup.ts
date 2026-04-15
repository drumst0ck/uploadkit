import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, relative, join, resolve } from 'node:path';
import type { BackupManifest, BackupManifestEntry } from './types.js';

const BACKUP_ROOT_DIR = '.uploadkit-backup';
const GITIGNORE_LINE = '.uploadkit-backup/';

export interface BackupSession {
  /** ISO-ish timestamp used as the session dir name. */
  readonly timestamp: string;
  /** Absolute path to the session dir (<root>/.uploadkit-backup/<timestamp>). */
  readonly dir: string;
  /**
   * Copy a soon-to-be-modified file into the session dir and record a
   * 'modify' entry. Path must be absolute and inside `root`.
   */
  save(absPath: string): Promise<void>;
  /**
   * Record a file the CLI will create (so restore can delete it). No copy
   * is performed. Path must be absolute and inside `root`.
   */
  recordCreate(absPath: string): void;
  /**
   * Write `manifest.json` into the session dir, ensure `.uploadkit-backup/`
   * is in `.gitignore`, and return the manifest. Safe to call multiple times
   * (writes are idempotent).
   */
  finalize(): Promise<BackupManifest>;
}

export interface CreateBackupSessionOptions {
  /** Override the timestamp (tests only). */
  timestamp?: string;
}

/**
 * Generate a filesystem-safe ISO-ish timestamp (no colons, which Windows
 * disallows; dot before ms also replaced). Includes millisecond precision so
 * rapid back-to-back sessions (e.g. an `init` immediately followed by an
 * `add` in a test harness) produce distinct directory names — otherwise the
 * second `finalize()` would overwrite the first session's manifest.json in
 * the shared dir. Example: `2026-04-15T14-32-07-482Z`.
 */
function defaultTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

/**
 * Creates a backup session rooted at `root`. All mutations are deferred
 * until `finalize()` is called.
 */
export function createBackupSession(
  root: string,
  opts: CreateBackupSessionOptions = {},
): BackupSession {
  const absRoot = resolve(root);
  const timestamp = opts.timestamp ?? defaultTimestamp();
  const dir = join(absRoot, BACKUP_ROOT_DIR, timestamp);
  const entries: BackupManifestEntry[] = [];

  const requireInsideRoot = (absPath: string): string => {
    const rel = relative(absRoot, absPath);
    if (rel.startsWith('..') || resolve(absRoot, rel) !== resolve(absPath)) {
      throw new Error(`Backup path must be inside root: ${absPath}`);
    }
    return rel;
  };

  return {
    timestamp,
    dir,
    async save(absPath: string): Promise<void> {
      const rel = requireInsideRoot(absPath);
      const target = join(dir, rel);
      await mkdir(dirname(target), { recursive: true });
      await cp(absPath, target);
      entries.push({ action: 'modify', relativePath: rel, backupPath: rel });
    },
    recordCreate(absPath: string): void {
      const rel = requireInsideRoot(absPath);
      entries.push({ action: 'create', relativePath: rel });
    },
    async finalize(): Promise<BackupManifest> {
      await mkdir(dir, { recursive: true });
      const manifest: BackupManifest = { timestamp, root: absRoot, entries };
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
      await ensureGitignoreEntry(absRoot);
      return manifest;
    },
  };
}

/**
 * Ensures `.uploadkit-backup/` appears exactly once in `<root>/.gitignore`.
 * Creates the file if missing; appends to an existing file with a
 * trailing newline. Idempotent — checks line-by-line to avoid false
 * positives from partial matches.
 */
async function ensureGitignoreEntry(root: string): Promise<void> {
  const path = join(root, '.gitignore');
  const existing = existsSync(path) ? await readFile(path, 'utf8') : '';
  const hasLine = existing.split(/\r?\n/).some((line) => line.trim() === GITIGNORE_LINE);
  if (hasLine) return;
  let next = existing;
  if (next.length > 0 && !next.endsWith('\n')) next += '\n';
  next += `${GITIGNORE_LINE}\n`;
  await writeFile(path, next, 'utf8');
}
