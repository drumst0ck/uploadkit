import { randomBytes } from 'node:crypto';
import { rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { MigrationEntry, MigrationFailure, MigrationState } from './types';

const STATE_VERSION = 1;

/**
 * In-memory mapping state with atomic persistence.
 *
 * Write strategy: write to `<path>.<rand>.tmp` then `rename` over the real
 * path. `rename` is atomic on POSIX, so a crash mid-write never leaves a
 * truncated mapping — callers either see the previous version or the new one.
 *
 * Callers should invoke `flush()` periodically (every N successes) and
 * `finalize()` at the end. The constructor accepts an existing state for
 * resume flows.
 */
export class MigrationStateStore {
  private readonly entries: MigrationEntry[];
  private readonly failures: MigrationFailure[];
  private revision = 0;
  private persistedRevision = 0;
  private flushChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly path: string,
    seed: MigrationState | null,
  ) {
    this.entries = seed ? [...seed.entries] : [];
    this.failures = [];
  }

  get migratedCount(): number {
    return this.entries.length;
  }

  get failureCount(): number {
    return this.failures.length;
  }

  /** Returns true if `oldUrl` was migrated in a previous run. */
  has(oldUrl: string): boolean {
    return this.entries.some((e) => e.oldUrl === oldUrl);
  }

  appendEntry(entry: MigrationEntry): void {
    this.entries.push(entry);
    this.revision++;
  }

  appendFailure(failure: MigrationFailure): void {
    this.failures.push(failure);
    this.revision++;
  }

  /** Atomically write the current state to disk. No-op if nothing changed. */
  async flush(meta: { bucket: string; route: string; startedAt: string }): Promise<void> {
    const requestedRevision = this.revision;
    this.flushChain = this.flushChain.then(async () => {
      if (this.persistedRevision >= requestedRevision) return;

      const snapshotRevision = this.revision;
      const state: MigrationState = {
        version: STATE_VERSION,
        startedAt: meta.startedAt,
        bucket: meta.bucket,
        route: meta.route,
        entries: [...this.entries],
        failures: [...this.failures],
      };
      await mkdir(dirname(this.path), { recursive: true });
      const tmp = `${this.path}.${randomBytes(6).toString('hex')}.tmp`;
      await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await rename(tmp, this.path);
      this.persistedRevision = snapshotRevision;
    });
    return this.flushChain;
  }
}

/** Load an existing mapping file. Returns null if the path doesn't exist. */
export async function loadState(path: string): Promise<MigrationState | null> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Mapping file at ${path} is not valid JSON (${err instanceof Error ? err.message : 'parse error'}). ` +
        `Move it aside or pass a different --out path to start fresh.`,
      { cause: err },
    );
  }
  if (!isMigrationState(parsed)) {
    throw new Error(`Mapping file at ${path} does not look like an UploadKit migration state.`);
  }
  return parsed;
}

function isMigrationState(value: unknown): value is MigrationState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<MigrationState>;
  return v.version === 1 && Array.isArray(v.entries);
}
