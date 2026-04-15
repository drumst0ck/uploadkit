/**
 * Idempotency marker comments per D-06.
 *
 * Every CLI-inserted block is bounded by these line comments so we can detect
 * a previous install (grep for MARKER_START) and so `uploadkit restore` can
 * strip the block without ambiguity.
 *
 * We intentionally use line comments (not block comments) so they survive
 * Prettier/biome reformatting, which is the failure mode flagged in phase
 * risk #1.
 */

export const MARKER_START = '// uploadkit:start';
export const MARKER_END = '// uploadkit:end';

/**
 * Returns true iff the source contains at least one complete marker pair
 * (a start marker followed by an end marker on a later line).
 */
export function hasMarkers(source: string): boolean {
  const startIdx = source.indexOf(MARKER_START);
  if (startIdx === -1) return false;
  const endIdx = source.indexOf(MARKER_END, startIdx + MARKER_START.length);
  return endIdx !== -1;
}

/**
 * Wraps a block of code with start/end markers and a human-readable suffix.
 * Returns a standalone string; callers are responsible for joining with
 * surrounding source (usually with a leading/trailing newline).
 */
export function wrapWithMarkers(block: string): string {
  const trimmed = block.replace(/^\n+|\n+$/g, '');
  return `${MARKER_START} — do not edit this block manually\n${trimmed}\n${MARKER_END}`;
}

/**
 * Removes the first marker-bounded block from the source, returning:
 * - stripped: source with the block and its markers removed
 * - block:    the inner content (without markers); null if no markers found
 *
 * Used by the `restore` subcommand and by idempotency checks in tests.
 */
export function stripMarkerBlock(source: string): { stripped: string; block: string | null } {
  const startIdx = source.indexOf(MARKER_START);
  if (startIdx === -1) return { stripped: source, block: null };
  const endIdx = source.indexOf(MARKER_END, startIdx + MARKER_START.length);
  if (endIdx === -1) return { stripped: source, block: null };

  // Find end-of-line after the END marker so we strip the whole line.
  const afterEnd = source.indexOf('\n', endIdx);
  const blockEndExclusive = afterEnd === -1 ? source.length : afterEnd + 1;

  // Find start-of-line for the START marker so we strip its leading whitespace.
  let lineStart = startIdx;
  while (lineStart > 0 && source[lineStart - 1] !== '\n') lineStart--;

  // Inner block = between the line after START marker and the line before END marker.
  const startLineEnd = source.indexOf('\n', startIdx);
  const innerStart = startLineEnd === -1 ? startIdx + MARKER_START.length : startLineEnd + 1;

  // Find start of END marker's line
  let endLineStart = endIdx;
  while (endLineStart > 0 && source[endLineStart - 1] !== '\n') endLineStart--;

  const innerRaw = source.slice(innerStart, endLineStart);
  const block = innerRaw.replace(/^\n+|\n+$/g, '');

  const stripped = source.slice(0, lineStart) + source.slice(blockEndExclusive);
  return { stripped, block };
}
