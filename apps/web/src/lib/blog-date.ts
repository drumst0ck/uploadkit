// Validates blog frontmatter dates at load time so a typo fails the build with a clear
// message instead of throwing RangeError in a page or printing "Invalid Date" in the RSS.
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseIsoDate(value: unknown, field: string, slug: string): string {
  let day: string | null = null
  if (value instanceof Date) {
    day = Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  } else if (typeof value === 'string' && ISO_DAY.test(value)) {
    const d = new Date(`${value}T00:00:00Z`)
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value) day = value
  }
  if (!day) {
    throw new Error(`Blog post "${slug}" has an invalid ${field} (expected YYYY-MM-DD): ${String(value)}`)
  }
  return day
}
