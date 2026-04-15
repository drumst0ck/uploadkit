import { parseModule, generateCode } from 'magicast';

export interface AddImportSpec {
  /** Module specifier (e.g. `@uploadkitdev/react`). */
  from: string;
  /** Named specifiers to add. Existing specifiers are not duplicated. */
  specifiers: string[];
}

/**
 * Adds one or more named imports to a JS/TS source string via magicast.
 *
 * Idempotent: if the module is already imported, only missing specifiers are
 * appended. If every specifier is already imported (by `local` name), the
 * source is returned unchanged (and code regeneration is still a no-op diff).
 *
 * Returns the regenerated source.
 */
export function addImport(source: string, spec: AddImportSpec): string {
  const mod = parseModule(source);
  const imports = mod.imports;

  // Collect already-imported locals for this `from`, keyed by local name.
  const existingLocals = new Set<string>();
  for (const item of imports.$items) {
    if (item.from === spec.from) {
      existingLocals.add(item.local);
    }
  }

  let changed = false;
  for (const name of spec.specifiers) {
    if (existingLocals.has(name)) continue;
    imports.$append({ from: spec.from, imported: name, local: name });
    existingLocals.add(name);
    changed = true;
  }

  if (!changed) return source;
  return generateCode(mod).code;
}
