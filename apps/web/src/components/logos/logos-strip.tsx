// Server Component — decorative "used by" strip with stylized pseudo-brand marks.
// Intentionally not real logos — it's a visual rhythm element between hero and features.

const LOGOS = [
  '◆ Linear-ish',
  '⎈ helmet.io',
  '∿ driftwood',
  '◉ orbit.dev',
  '▲ vercel-ish',
  '⬡ honeycomb',
  '✺ novastack',
] as const

export function LogosStrip() {
  return (
    <div className="logos" aria-label="Used by solo developers">
      <div className="d2-container">
        <div className="logos-label">Used by solo devs shipping fast</div>
        <div className="logos-row">
          {LOGOS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
