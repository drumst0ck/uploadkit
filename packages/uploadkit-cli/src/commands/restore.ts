import { mkdir, rename } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
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

  let chosen: (typeof manifests)[number] | null;

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
  } else if (parsed.flags.latest || parsed.flags.yes) {
    // `--latest` (or non-interactive `--yes`): pick the newest un-applied
    // session. `readManifests` returns newest-first; `.applied/` sessions
    // are skipped because they live inside a hidden subdir, which
    // `readManifests` does not recurse into.
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

    // When `--latest` was used, move the applied session dir into
    // `.uploadkit-backup/.applied/<ts>/` so the next `restore --latest`
    // run walks down the stack instead of restoring the same session
    // forever. `readManifests` does not descend into `.applied/`, so the
    // audit trail is preserved without cluttering future pickers.
    if (parsed.flags.latest) {
      const absRoot = resolve(chosen.root);
      const backupRoot = join(absRoot, '.uploadkit-backup');
      const from = join(backupRoot, chosen.timestamp);
      const to = join(backupRoot, '.applied', chosen.timestamp);
      try {
        await mkdir(dirname(to), { recursive: true });
        await rename(from, to);
      } catch (moveErr) {
        // Non-fatal: the restore already succeeded. Surface the issue so
        // the user knows the next `--latest` will pick the same session.
        const msg = moveErr instanceof Error ? moveErr.message : String(moveErr);
        process.stderr.write(
          `${pc.yellow('[uploadkit]')} Restore succeeded but could not archive the session to .applied/: ${msg}\n`,
        );
      }
    }

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
