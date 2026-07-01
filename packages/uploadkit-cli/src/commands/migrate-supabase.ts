import pc from 'picocolors';
import * as p from '@clack/prompts';
import { TIER_LIMITS } from '@uploadkitdev/shared';
import type { ParsedArgs } from '../args.js';
import { createSupabaseClient } from '../migrate/supabase.js';
import { fetchProjectInfo, uploadToUploadKit } from '../migrate/uploadkit.js';
import { MigrationStateStore, loadState } from '../migrate/state.js';
import { runPool } from '../migrate/pool.js';
import type { MigrationConfig, MigrationEntry, MigrationFailure, MigrationState, SupabaseObject } from '../migrate/types.js';

const DEFAULT_BASE_URL = 'https://api.uploadkit.dev';
const DEFAULT_CONCURRENCY = 4;
const FLUSH_EVERY = 5;

/**
 * `uploadkit migrate-supabase` — streams objects from a Supabase Storage
 * bucket into UploadKit, persisting a JSON mapping of `oldUrl → newUrl` for
 * downstream URL rewrites.
 *
 * Flow:
 *  1. Resolve config (flag → env → interactive prompt).
 *  2. Validate connectivity both sides.
 *  3. Paginate the bucket; pre-flight check oversized files.
 *  4. Worker pool migrates each object; mapping flushed every N successes.
 *  5. Summary + exit code (1 if any failures).
 */
export async function run(parsed: ParsedArgs): Promise<number> {
  const flags = parsed.flags;
  const config = await resolveConfig(flags);
  if (config === null) return 1; // user cancelled or config missing

  if (flags.dryRun) {
    return await dryRun(config);
  }

  // Load existing mapping for resume. loadState swallows ENOENT (returns null);
  // a JSON parse error is the only failure mode and is fatal — surface + bail.
  const seedPath = config.resumePath ?? config.outPath;
  let seed: MigrationState | null;
  try {
    seed = await loadState(seedPath);
  } catch (err) {
    process.stderr.write(`${pc.red('error')} ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  if (seed) {
    process.stdout.write(`${pc.dim(`Resuming from ${seedPath} (${seed.entries.length} already migrated)`)}\n`);
  }

  const store = new MigrationStateStore(config.outPath, seed);
  const startedAt = new Date().toISOString();

  // Connectivity checks — fail fast before we touch the bucket.
  const projectInfo = await validateUploadKit(config);
  if (projectInfo === null) return 1;
  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseKey, config.supabaseBucket);
  if (!(await validateSupabase(supabase, config))) return 1;

  // Pre-flight: scan bucket for oversized files.
  const tierLimit = lookupTierLimit(projectInfo.tier);
  const oversized = await countOversized(supabase, config.prefix, tierLimit);
  if (oversized.count > 0) {
    const label = `${oversized.count} file${oversized.count === 1 ? '' : 's'} exceed your ${projectInfo.tier} tier's ${formatBytes(tierLimit)} per-file limit`;
    process.stderr.write(`${pc.yellow('warn')} ${label} and will fail during migration.\n`);
    if (!config.yes) {
      const proceed = await p.confirm({
        message: 'Continue anyway? (oversized files will be skipped on failure)',
        initialValue: false,
      });
      if (p.isCancel(proceed) || !proceed) {
        process.stderr.write(`${pc.yellow('[uploadkit]')} Cancelled.\n`);
        return 1;
      }
    }
  }

  // SIGINT handler — flush mapping on Ctrl-C so partial progress survives.
  const ac = new AbortController();
  const onSigint = () => {
    ac.abort();
  };
  process.once('SIGINT', onSigint);

  // Migration loop. Each worker returns a discriminated result so the store
  // is the single mutator of on-disk state.
  let skipped = 0;
  let migrationError: unknown;
  try {
    await runPool<SupabaseObject>(
      flattenObjects(supabase.list(config.prefix)),
      async (obj, signal) => {
        const oldUrl = supabase.publicUrl(obj.name);
        if (store.has(oldUrl)) {
          skipped++;
          return;
        }
        const result = await migrateOne(supabase, config, obj, oldUrl, signal);
        if (result.ok) {
          store.appendEntry(result.entry);
        } else if (!signal.aborted) {
          store.appendFailure(result.failure);
        }
        if ((store.migratedCount + store.failureCount) % FLUSH_EVERY === 0) {
          await store.flush({ bucket: config.supabaseBucket, route: config.uploadkitRoute, startedAt });
        }
      },
      { concurrency: config.concurrency, signal: ac.signal },
    );
  } catch (err) {
    migrationError = err;
  } finally {
    process.off('SIGINT', onSigint);
    try {
      await store.flush({ bucket: config.supabaseBucket, route: config.uploadkitRoute, startedAt });
    } catch (err) {
      migrationError ??= err;
    }
  }

  if (ac.signal.aborted) {
    process.stderr.write(`${pc.yellow('[uploadkit]')} Migration cancelled; partial mapping saved to ${config.outPath}.\n`);
    return 130;
  }
  if (migrationError) {
    process.stderr.write(
      `${pc.red('error')} Migration stopped: ${migrationError instanceof Error ? migrationError.message : String(migrationError)}\n`,
    );
    return 1;
  }

  // Pull failures out of store for summary.
  const failedTotal = store.failureCount;
  const migratedTotal = store.migratedCount;

  process.stdout.write('\n');
  process.stdout.write(`${pc.green('✔')} Migration complete\n`);
  process.stdout.write(`  ${pc.bold('Migrated:')}  ${migratedTotal}\n`);
  process.stdout.write(`  ${pc.bold('Skipped:')}   ${skipped} (already in mapping)\n`);
  if (failedTotal > 0) {
    process.stdout.write(`  ${pc.red('Failed:')}    ${failedTotal}\n`);
  }
  process.stdout.write(`  ${pc.bold('Mapping:')}   ${config.outPath}\n`);

  return failedTotal > 0 ? 1 : 0;
}

// ---------- config resolution ----------

async function resolveConfig(flags: ParsedArgs['flags']): Promise<MigrationConfig | null> {
  const supabaseUrl = flags.supabaseUrl ?? process.env.SUPABASE_URL ?? await promptText('Supabase project URL', 'https://xxxx.supabase.co');
  if (supabaseUrl === null) return null;

  const supabaseKey = flags.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? await promptSecret('Supabase service_role key', 'Grants full bucket access — handle carefully');
  if (supabaseKey === null) return null;

  const supabaseBucket = flags.supabaseBucket ?? process.env.SUPABASE_BUCKET ?? await promptText('Supabase bucket name', 'e.g. avatars');
  if (supabaseBucket === null) return null;

  const uploadkitKey = flags.uploadkitKey ?? process.env.UPLOADKIT_API_KEY ?? await promptSecret('UploadKit API key', 'uk_live_…');
  if (uploadkitKey === null) return null;

  const uploadkitRoute = flags.uploadkitRoute ?? process.env.UPLOADKIT_ROUTE ?? await promptText('UploadKit route slug', 'default');
  if (uploadkitRoute === null) return null;

  const uploadkitApi = flags.uploadkitApi ?? process.env.UPLOADKIT_API_URL ?? DEFAULT_BASE_URL;

  const concurrency = flags.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) {
    process.stderr.write(`${pc.red('error')} --concurrency must be an integer between 1 and 64.\n`);
    return null;
  }
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = flags.out ?? `./uploadkit-migration-${stamp}.json`;
  const resumePath = flags.resume ?? undefined;

  return {
    supabaseUrl,
    supabaseKey,
    supabaseBucket,
    uploadkitApi,
    uploadkitKey,
    uploadkitRoute,
    prefix: flags.prefix,
    concurrency,
    outPath,
    resumePath,
    dryRun: flags.dryRun,
    yes: flags.yes,
  };
}

async function promptText(message: string, placeholder: string): Promise<string | null> {
  const v = await p.text({ message, placeholder });
  if (p.isCancel(v)) return null;
  if (typeof v !== 'string' || v.trim().length === 0) {
    process.stderr.write(`${pc.red('error')} Value required.\n`);
    return null;
  }
  return v.trim();
}

async function promptSecret(message: string, hint: string): Promise<string | null> {
  const v = await p.text({ message, placeholder: hint });
  if (p.isCancel(v)) return null;
  if (typeof v !== 'string' || v.trim().length === 0) {
    process.stderr.write(`${pc.red('error')} Value required.\n`);
    return null;
  }
  return v.trim();
}

// ---------- dry run ----------

async function dryRun(config: MigrationConfig): Promise<number> {
  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseKey, config.supabaseBucket);
  let count = 0;
  let bytes = 0;
  const oversized: { name: string; size: number }[] = [];
  const tierLimit = lookupTierLimit('FREE');
  for await (const batch of supabase.list(config.prefix)) {
    for (const obj of batch) {
      count++;
      const size = obj.metadata?.size ?? 0;
      bytes += size;
      if (size > tierLimit) oversized.push({ name: obj.name, size });
    }
  }
  process.stdout.write(`${pc.bold('Dry run')}\n`);
  process.stdout.write(`  Objects:    ${count}\n`);
  process.stdout.write(`  Total size: ${formatBytes(bytes)}\n`);
  if (oversized.length > 0) {
    process.stdout.write(`  ${pc.yellow(`Oversized (assuming FREE tier ${formatBytes(tierLimit)} limit): ${oversized.length}`)}\n`);
  }
  process.stdout.write(`  ${pc.dim('No files were uploaded. Re-run without --dry-run to migrate.')}\n`);
  return 0;
}

// ---------- connectivity ----------

async function validateUploadKit(config: MigrationConfig) {
  try {
    const info = await fetchProjectInfo(config.uploadkitApi, config.uploadkitKey);
    process.stdout.write(`${pc.dim(`UploadKit connected (tier: ${info.tier}).`)}\n`);
    return info;
  } catch (err) {
    process.stderr.write(
      `${pc.red('error')} UploadKit auth failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return null;
  }
}

async function validateSupabase(supabase: ReturnType<typeof createSupabaseClient>, config: MigrationConfig): Promise<boolean> {
  // Attempt a tiny list call — cheapest validation that both bucket + key work.
  try {
    for await (const _batch of supabase.list(config.prefix ?? '')) {
      void _batch;
      break;
    }
    return true;
  } catch (err) {
    process.stderr.write(
      `${pc.red('error')} Supabase connection failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return false;
  }
}

// ---------- pre-flight ----------

async function countOversized(
  supabase: ReturnType<typeof createSupabaseClient>,
  prefix: string | undefined,
  limit: number,
): Promise<{ count: number }> {
  let count = 0;
  for await (const batch of supabase.list(prefix)) {
    for (const obj of batch) {
      const size = obj.metadata?.size ?? 0;
      if (size > limit) count++;
    }
  }
  return { count };
}

function lookupTierLimit(tier: string): number {
  const t = (tier ?? 'FREE').toUpperCase();
  // Only FREE / PRO / TEAM / ENTERPRISE are defined. Fall back to FREE (most strict).
  if (t === 'PRO') return TIER_LIMITS.PRO.maxFileSizeBytes;
  if (t === 'TEAM') return TIER_LIMITS.TEAM.maxFileSizeBytes;
  if (t === 'ENTERPRISE') return TIER_LIMITS.ENTERPRISE.maxFileSizeBytes;
  return TIER_LIMITS.FREE.maxFileSizeBytes;
}

// ---------- single-object migration ----------

type MigrateOneResult =
  | { ok: true; entry: MigrationEntry }
  | { ok: false; failure: MigrationFailure };

async function migrateOne(
  supabase: ReturnType<typeof createSupabaseClient>,
  config: MigrationConfig,
  obj: SupabaseObject,
  oldUrl: string,
  signal: AbortSignal,
): Promise<MigrateOneResult> {
  let size = obj.metadata?.size ?? 0;
  let contentType = obj.metadata?.mimetype ?? 'application/octet-stream';
  let stage: MigrationFailure['stage'] = 'head';
  try {
    // HEAD only when metadata is missing (rare for freshly created objects).
    if (!obj.metadata?.size || !obj.metadata?.mimetype) {
      const headed = await supabase.head(obj.name);
      size = headed.size;
      contentType = headed.contentType;
    }

    stage = 'request';
    const stream = await supabase.stream(obj.name, signal);
    const fileName = obj.name.split('/').pop() ?? obj.name;
    const result = await uploadToUploadKit({
      baseUrl: config.uploadkitApi,
      apiKey: config.uploadkitKey,
      route: config.uploadkitRoute,
      fileName,
      contentType,
      size,
      body: stream,
      signal,
    });

    return {
      ok: true,
      entry: {
        oldUrl,
        newUrl: result.cdnUrl,
        key: obj.name,
        size,
        contentType,
        migratedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      failure: {
        key: obj.name,
        oldUrl,
        stage,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// ---------- formatting ----------

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** Flattens the paged AsyncIterable<SupabaseObject[]> into AsyncIterable<SupabaseObject>. */
async function* flattenObjects(
  pages: AsyncIterable<SupabaseObject[]>,
): AsyncIterable<SupabaseObject> {
  for await (const batch of pages) {
    for (const obj of batch) yield obj;
  }
}
