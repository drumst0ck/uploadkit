/**
 * Merges a base class string with an optional override string.
 * Simple utility — no dependency on clsx/cva to keep the bundle lean.
 */
export function mergeClass(base: string, override?: string): string {
  if (!override) return base;
  return `${base} ${override}`;
}
