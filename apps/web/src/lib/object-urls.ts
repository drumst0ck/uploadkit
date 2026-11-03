// Release blob: object URLs for items that fell out of a list (browser memory is not
// reclaimed until revoked). Non-blob URLs are ignored.
export function revokeDropped<T extends { key: string; url: string }>(before: T[], after: T[]): void {
  const kept = new Set(after.map((f) => f.key))
  for (const f of before) {
    if (!kept.has(f.key) && f.url.startsWith('blob:')) URL.revokeObjectURL(f.url)
  }
}
