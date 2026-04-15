import {
  MARKER_START,
  MARKER_END,
  JSX_MARKER_START,
  JSX_MARKER_END,
  hasMarkers,
} from './markers.js';

export interface WrapChildrenOptions {
  /** Parent tag whose children will be wrapped (e.g. "body"). */
  parentTag: string;
  /** Opening wrapper element (e.g. `<UploadKitProvider>`). */
  wrapperOpen: string;
  /** Closing wrapper element (e.g. `</UploadKitProvider>`). */
  wrapperClose: string;
  /**
   * Marker comment style. Default `'jsx'` is safe inside JSX element children
   * (renders nothing in the DOM). Use `'line'` only for non-JSX positions.
   */
  markerStyle?: 'jsx' | 'line';
}

/**
 * Wraps the direct children of the first `<parentTag>…</parentTag>` JSX
 * element in the source with `wrapperOpen …children… wrapperClose`, bounded
 * by `uploadkit:start` / `uploadkit:end` markers (D-06) so re-runs are
 * idempotent.
 *
 * Magicast cannot directly express nested JSX mutations — per D-03 we fall
 * back to a regex-bounded string edit. The marker comments make the edit
 * detectable and reversible. This helper is intentionally scoped to a
 * single, shallow pattern: the first `<body>` (or user-specified parent)
 * opening and closing tags in the file. Callers that need deeper
 * manipulation should supply a precomposed block and use `addImport` +
 * this helper together.
 *
 * Known limitations:
 * - Assumes one `<parentTag>` per file (Next.js layouts have exactly one
 *   `<body>`; Remix `app/root.tsx` has one `<body>`). Multiple instances
 *   would only wrap the first match.
 * - Cannot handle `<parentTag>` produced by a dynamic expression; the
 *   opening tag must be literal JSX.
 * - If the existing children span a self-closing `<parentTag />`, we throw
 *   since there's nothing to wrap.
 *
 * Idempotency: if the source already contains `MARKER_START` inside the
 * parent tag, returns the source unchanged.
 *
 * Throws when `parentTag` is not found or is self-closing.
 */
export function wrapChildrenOf(source: string, opts: WrapChildrenOptions): string {
  const { parentTag, wrapperOpen, wrapperClose } = opts;

  // Match the opening tag (capturing any attributes) and the matching close.
  // Non-greedy capture of children; assumes the first <parentTag>…</parentTag>
  // we see is the intended one (true for layout/root files per D-05).
  const openTagPattern = new RegExp(`<${parentTag}(\\s[^>]*)?>`);
  const openMatch = openTagPattern.exec(source);
  if (!openMatch) {
    // Check for self-closing variant to give a more helpful error.
    const selfClosing = new RegExp(`<${parentTag}(\\s[^>]*)?/>`).test(source);
    if (selfClosing) {
      throw new Error(
        `wrapChildrenOf: <${parentTag} /> is self-closing — nothing to wrap. Edit the file manually.`,
      );
    }
    throw new Error(`wrapChildrenOf: <${parentTag}> not found in source.`);
  }

  const openStart = openMatch.index;
  const openEnd = openStart + openMatch[0].length;
  const closeTag = `</${parentTag}>`;
  const closeStart = source.indexOf(closeTag, openEnd);
  if (closeStart === -1) {
    throw new Error(`wrapChildrenOf: closing </${parentTag}> not found.`);
  }

  const innerRaw = source.slice(openEnd, closeStart);

  // Idempotency: if our markers are already inside this parent block, skip.
  if (hasMarkers(innerRaw)) {
    return source;
  }

  // Detect indentation used by the first non-blank inner line so the inserted
  // wrapper lines up visually with existing children. Falls back to 8 spaces.
  const indentMatch = /\n([ \t]+)\S/.exec(innerRaw);
  const childIndent: string = indentMatch?.[1] ?? '        ';

  // Re-indent the existing children one level deeper since they now nest
  // inside <wrapperOpen>. We add 2 spaces to each non-empty line's indent.
  const trimmedChildren = innerRaw.replace(/^\n+|\n+$/g, '');
  const reindentedChildren = trimmedChildren
    .split('\n')
    .map((line) => (line.length === 0 ? line : `  ${line}`))
    .join('\n');

  const markerStyle = opts.markerStyle ?? 'jsx';
  const startMarker = markerStyle === 'jsx' ? JSX_MARKER_START : MARKER_START;
  const endMarker = markerStyle === 'jsx' ? JSX_MARKER_END : MARKER_END;

  const wrapped =
    `\n${childIndent}${startMarker}\n` +
    `${childIndent}${wrapperOpen}\n` +
    `${reindentedChildren}\n` +
    `${childIndent}${wrapperClose}\n` +
    `${childIndent}${endMarker}\n${childIndent.slice(0, Math.max(0, childIndent.length - 2))}`;

  return source.slice(0, openEnd) + wrapped + source.slice(closeStart);
}
