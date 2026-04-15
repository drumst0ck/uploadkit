import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addImport } from '../codemods/imports.js';
import type { BackupSession } from '../backup/backup.js';
import { COMPONENTS, type ComponentAlias } from './catalog.js';

/**
 * Marker comment string used to delimit a per-component insert block.
 *
 * Different from the layout-level `uploadkit:start` marker used by `init`:
 * `add` emits a per-component variant so multiple components can coexist
 * in the same file, each with its own idempotency key.
 */
function markerStart(alias: ComponentAlias): string {
  return `{/* uploadkit:start — ${alias} */}`;
}
function markerEnd(alias: ComponentAlias): string {
  return `{/* uploadkit:end — ${alias} */}`;
}

export interface InsertComponentResult {
  /** True when the component was already present and nothing was written. */
  skipped: boolean;
  /** True when we wrote the file. */
  modified: boolean;
}

// Resolve template dir relative to the compiled module. During vitest the
// .ts sources are executed in place, so `__dirname` points at src/add; in
// the built bundle tsup copies templates to dist/add-templates.
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_CANDIDATES = [
  resolve(MODULE_DIR, 'templates'), // src/add/templates (vitest)
  resolve(MODULE_DIR, 'add-templates'), // dist/add-templates (built — tsup onSuccess)
];

async function loadTemplate(alias: ComponentAlias): Promise<string> {
  const filename = `${alias}.tsx.tpl`;
  for (const base of TEMPLATE_CANDIDATES) {
    try {
      const raw = await readFile(join(base, filename), 'utf8');
      return raw.replace(/\n+$/g, '');
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Template not found for component alias: ${alias}`);
}

/**
 * Locate the first top-level JSX element returned by a default-exported
 * React component function in the source.
 *
 * Looks for the first `return (` or `return <` after `export default function`
 * (or `export default () =>`), then walks forward to the opening tag of the
 * first JSX element.
 *
 * Returns the character index at which to insert snippets as the first
 * child of that element, plus the indentation string that should prefix the
 * inserted block. Returns `null` when no suitable site is found.
 */
interface InsertionSite {
  /** Absolute index into `source` to splice the marker+snippet+marker block. */
  insertAt: number;
  /** Indentation used for each inserted line. */
  indent: string;
}

function findInsertionSite(source: string): InsertionSite | null {
  // Match the start of a default-exported component body — tolerate function
  // declarations (`export default function X(`) and arrow exports
  // (`export default function(` or `export default () =>`).
  const exportPattern = /export\s+default\s+(?:function\s*\w*\s*\([^)]*\)|\([^)]*\)\s*=>|function\s*\([^)]*\))/g;
  const exportMatch = exportPattern.exec(source);
  if (!exportMatch) return null;

  const afterExport = source.slice(exportMatch.index);

  // Find `return ( <Elem …>` or `return <Elem …>` following the default export.
  const returnPattern = /return\s*\(?\s*(<[A-Za-z][A-Za-z0-9]*)/;
  const returnMatch = returnPattern.exec(afterExport);
  if (!returnMatch) return null;

  // Absolute position of the opening `<` of the returned JSX element.
  const openTagStart = exportMatch.index + returnMatch.index + returnMatch[0].indexOf('<');

  // Walk forward to the first `>` that closes the opening tag (ignoring `/>`
  // since that's a self-closing element with no children).
  let i = openTagStart;
  let seenChar = false;
  let selfClosing = false;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '>' && source[i - 1] === '/') {
      selfClosing = true;
      break;
    }
    if (ch === '>') {
      break;
    }
    if (!seenChar && ch !== '<') seenChar = true;
    i++;
  }
  if (selfClosing || i >= source.length) return null;

  const insertAt = i + 1; // right after the `>`

  // Infer indentation of the NEXT non-empty line after the opening tag, or
  // fall back to one-level-in of the opening tag's column + 2.
  const restAfterOpen = source.slice(insertAt);
  const nextLine = /\n([ \t]*)\S/.exec(restAfterOpen);
  let indent = '      ';
  if (nextLine?.[1]) {
    indent = nextLine[1];
  } else {
    // Compute column of the opening tag and add 2.
    const lineStart = source.lastIndexOf('\n', openTagStart) + 1;
    const column = openTagStart - lineStart;
    indent = ' '.repeat(column + 2);
  }

  return { insertAt, indent };
}

export interface InsertComponentOptions {
  /** Session that must back up the file before modification. */
  session: BackupSession;
}

/**
 * Inserts the `alias` component into `filePath`.
 *
 * Flow:
 *  1. Read the file.
 *  2. If the per-component marker is already present → return {skipped:true}.
 *  3. session.save() the file before mutation.
 *  4. addImport for the component's named export from `@uploadkitdev/react`.
 *  5. Find the first returned JSX element in the default-exported component;
 *     splice `markerStart + snippet + markerEnd` as the first child.
 *  6. Fall back (rare) to appending a comment-wrapped snippet after the last
 *     import when no JSX return is found.
 *  7. Write the file.
 *
 * Idempotency: the per-component marker (`uploadkit:start — <alias>`) is the
 * unique key. `hasMarkers` from codemods is too coarse here — two different
 * components must be insertable into the same file.
 */
export async function insertComponent(
  filePath: string,
  alias: ComponentAlias,
  opts: InsertComponentOptions,
): Promise<InsertComponentResult> {
  const spec = COMPONENTS[alias];
  const source = await readFile(filePath, 'utf8');

  const startNeedle = `uploadkit:start — ${alias}`;
  if (source.includes(startNeedle)) {
    return { skipped: true, modified: false };
  }

  await opts.session.save(filePath);

  // (4) Add the import.
  const withImport = addImport(source, {
    from: spec.pkg,
    specifiers: [spec.import],
  });

  // (5) Find insertion site and splice the snippet.
  const snippet = await loadTemplate(alias);
  const site = findInsertionSite(withImport);

  let next: string;
  if (site) {
    const block =
      `\n${site.indent}${markerStart(alias)}\n` +
      `${site.indent}${snippet}\n` +
      `${site.indent}${markerEnd(alias)}`;
    next = withImport.slice(0, site.insertAt) + block + withImport.slice(site.insertAt);
  } else {
    // (6) Fallback — append a commented reference block after the last import.
    const lastImportMatch = /^import[^;]*;?\s*$/gm;
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    while ((m = lastImportMatch.exec(withImport)) !== null) {
      lastEnd = m.index + m[0].length;
    }
    const fallback =
      `\n\n/* uploadkit:start — ${alias}\n` +
      `${snippet}\n` +
      `uploadkit:end — ${alias} */\n`;
    next = withImport.slice(0, lastEnd) + fallback + withImport.slice(lastEnd);
  }

  if (next === source) {
    // Nothing changed (shouldn't happen — marker check above would have caught it),
    // but keep the no-op contract tight.
    return { skipped: true, modified: false };
  }

  await writeFile(filePath, next, 'utf8');
  return { skipped: false, modified: true };
}

/** Exposed for unit testing the JSX-site finder. */
export const __findInsertionSite = findInsertionSite;
