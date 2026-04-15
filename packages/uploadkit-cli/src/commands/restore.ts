import { relative } from 'node:path';
import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';
import { readManifests } from '../backup/restore-manifest.js';
import { applyRestore } from '../restore/apply.js';
import { pickSession } from '../restore/prompt.js';

/**
 * `uploadkit restore` — roll back a previous `init` / `add` run.
 *
 * Flow:
 *  1. List manifests in `.uploadkit-backup/`. If none, exit 0 with message.
 *  2. If `--timestamp <iso>` is passed, pick that manifest (or exit 1).
 *  3. Otherwise prompt the user to choose.
 *  4. Replay the manifest via `applyRestore` and print a summary.
 */
export async function run(parsed: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const manifests = await readManifests(cwd);

  if (manifests.length === 0) {
    process.stdout.write(
      `${pc.yellow('[uploadkit]')} No backup sessions found in .uploadkit-backup/. Nothing to restore.\n`,
    );
    return 0;
  }

  let chosen = null as (typeof manifests)[number] | null;

  if (parsed.flags.timestamp) {
    chosen = manifests.find((m) => m.timestamp === parsed.flags.timestamp) ?? null;
    if (!chosen) {
      process.stderr.write(
        `${pc.red('error')} No backup session with timestamp "${parsed.flags.timestamp}".\n`,
      );
      process.stderr.write(`${pc.dim('Available:')}\n`);
      for (const m of manifests) {
        process.stderr.write(`  - ${m.timestamp}\n`);
      }
      return 1;
    }
  } else if (parsed.flags.yes) {
    // Non-interactive: default to the most recent session.
    chosen = manifests[0] ?? null;
  } else {
    chosen = await pickSession(manifests);
    if (!chosen) {
      process.stdout.write(`${pc.yellow('[uploadkit]')} Cancelled.\n`);
      return 1;
    }
  }

  if (!chosen) {
    process.stdout.write(`${pc.yellow('[uploadkit]')} Cancelled.\n`);
    return 1;
  }

  try {
    const result = await applyRestore(chosen, { yes: parsed.flags.yes });
    const rel = (p: string): string => relative(cwd, p) || p;
    process.stdout.write(`\n${pc.green('✔')} Restore complete (${chosen.timestamp})\n`);
    if (result.restored.length > 0) {
      process.stdout.write(`\n  ${pc.bold('restored')}\n`);
      for (const f of result.restored) process.stdout.write(`    ~ ${rel(f)}\n`);
    }
    if (result.deleted.length > 0) {
      process.stdout.write(`\n  ${pc.bold('deleted')}\n`);
      for (const f of result.deleted) process.stdout.write(`    - ${rel(f)}\n`);
    }
    if (result.skipped.length > 0) {
      process.stdout.write(`\n  ${pc.bold('skipped')}\n`);
      for (const f of result.skipped) process.stdout.write(`    · ${rel(f)}\n`);
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${pc.red('error')} ${message}\n`);
    return 1;
  }
}
