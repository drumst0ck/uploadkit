/** Escape user input so it matches literally inside a RegExp / Mongo $regex. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
