/**
 * Merges class name strings, filtering out falsy values.
 * Simple utility — no dependency on clsx/cva to keep the bundle lean.
 */
export function mergeClass(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
