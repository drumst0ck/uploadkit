import { readFile, writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import * as p from '@clack/prompts';
import fastGlob from 'fast-glob';
import { loadState } from '../migrate/state.js';
import type { ParsedArgs } from '../args.js';

/**
 * `uploadkit rewrite-urls` — rewrites Supabase URLs in a glob of files to
 * their migrated UploadKit equivalents.
 *
 * Reads the mapping JSON produced by `migrate-supabase` and replaces every
 * exact `oldUrl` occurrence with `newUrl` in the matched files. Only exact
 * string replacement is supported in v1 — regex / DB / SQL dumps are out of
 * scope (users consume the JSON mapping directly for those).
 */
export async function run(parsed: ParsedArgs): Promise<number> {
  const { mapping, glob, dryRun, yes } = parsed.flags;

  if (!mapping) {
    process.stderr.write(`${pc.red('error')} --mapping <path.json> is required.\n`);
    return 1;
  }
  if (!glob) {
    process.stderr.write(`${pc.red('error')} --glob <pattern> is required.\n`);
    return 1;
  }

  let state;
  try {
    state = await loadState(mapping);
  } catch (err) {
    process.stderr.write(`${pc.red('error')} ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  if (!state) {
    process.stderr.write(`${pc.red('error')} Mapping file not found: ${mapping}\n`);
    return 1;
  }
  if (state.entries.length === 0) {
    process.stderr.write(`${pc.yellow('warn')} Mapping has no entries — nothing to rewrite.\n`);
    return 0;
  }

  // Build replacement table. If duplicates exist (re-migrated same URL),
  // the last entry wins — most recent migration is canonical.
  const replacements = new Map<string, string>();
  for (const e of state.entries) replacements.set(e.oldUrl, e.newUrl);

  process.stdout.write(`${pc.dim(`Loaded ${replacements.size} URL mappings from ${mapping}`)}\n`);

  const files = await fastGlob(glob, {
    onlyFiles: true,
    dot: false,
    ignore: ['**/node_modules/**', '**/.git/**'],
    absolute: true,
  });
  if (files.length === 0) {
    process.stderr.write(`${pc.yellow('warn')} Glob matched zero files: ${glob}\n`);
    return 0;
  }

  if (dryRun) {
    const result = await scanAndRewrite(files, replacements, true);
    process.stdout.write(`${pc.bold('Dry run')}\n`);
    process.stdout.write(`  Files matched:  ${files.length}\n`);
    process.stdout.write(`  Files changed:  ${result.changed}\n`);
    process.stdout.write(`  Replacements:   ${result.replacements}\n`);
    process.stdout.write(`  ${pc.dim('No files were modified. Re-run without --dry-run to apply.')}\n`);
    return 0;
  }

  if (!yes) {
    const confirm = await p.confirm({
      message: `Rewrite URLs in ${files.length} file${files.length === 1 ? '' : 's'}?`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      process.stderr.write(`${pc.yellow('[uploadkit]')} Cancelled.\n`);
      return 1;
    }
  }

  const result = await scanAndRewrite(files, replacements, false);
  process.stdout.write(`${pc.green('✔')} Rewrote ${result.replacements} URL${result.replacements === 1 ? '' : 's'} in ${result.changed} file${result.changed === 1 ? '' : 's'}.\n`);
  return 0;
}

async function scanAndRewrite(
  files: string[],
  replacements: Map<string, string>,
  dryRun: boolean,
): Promise<{ changed: number; replacements: number }> {
  let changed = 0;
  let totalReplacements = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      // Skip unreadable / binary files silently — matches user expectation
      // that the glob may catch the odd non-text file.
      continue;
    }

    let fileReplacements = 0;
    let next = content;
    for (const [oldUrl, newUrl] of replacements) {
      if (!next.includes(oldUrl)) continue;
      // Count occurrences first for accurate reporting.
      const occurrences = countOccurrences(next, oldUrl);
      next = next.split(oldUrl).join(newUrl);
      fileReplacements += occurrences;
    }

    if (fileReplacements === 0) continue;
    changed++;
    totalReplacements += fileReplacements;
    if (!dryRun) {
      await writeFile(file, next, 'utf8');
    }
  }

  return { changed, replacements: totalReplacements };
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}
