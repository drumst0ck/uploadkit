import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Merges `entries` into a dotenv-style file at `filePath`.
 *
 * Behavior (per phase plan D-07 / mitigation #6):
 * - Creates the file if absent (with a trailing newline).
 * - Never overwrites existing keys — even if their value differs.
 * - Ignores commented-out key definitions (lines starting with `#`) when
 *   detecting existing keys; the commented line is preserved.
 * - Preserves blank lines and comments exactly.
 * - Appends missing keys in insertion order, each on its own `KEY=VALUE` line.
 *
 * Returns the list of keys that were appended (empty if no change was needed).
 *
 * Pure string manipulation — no dotenv dependency.
 */
export async function mergeEnv(
  filePath: string,
  entries: Record<string, string>,
): Promise<string[]> {
  const existing = existsSync(filePath) ? await readFile(filePath, 'utf8') : '';

  // Parse existing (active, non-commented) keys.
  const existingKeys = new Set<string>();
  for (const rawLine of existing.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (key) existingKeys.add(key);
  }

  const toAppend: string[] = [];
  for (const [key, value] of Object.entries(entries)) {
    if (existingKeys.has(key)) continue;
    toAppend.push(`${key}=${value}`);
    existingKeys.add(key);
  }

  if (toAppend.length === 0 && existing !== '') {
    return [];
  }

  // Ensure we end existing content with a newline before appending.
  let next = existing;
  if (next.length > 0 && !next.endsWith('\n')) next += '\n';
  if (toAppend.length > 0) {
    next += toAppend.join('\n') + '\n';
  }

  await writeFile(filePath, next, 'utf8');
  return toAppend.map((l) => l.slice(0, l.indexOf('=')));
}
