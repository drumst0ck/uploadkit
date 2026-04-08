// Server Component — no "use client"
// Full feature comparison table across all 4 tiers

const CheckIcon = () => (
  <svg
    className="matrix-check"
    viewBox="0 0 16 16"
    fill="none"
    aria-label="Included"
    role="img"
  >
    <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.2" />
    <path
      d="M4.5 8.25l2.5 2.5 4.5-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const XIcon = () => (
  <svg
    className="matrix-x"
    viewBox="0 0 16 16"
    fill="none"
    aria-label="Not included"
    role="img"
  >
    <path
      d="M5 5l6 6M11 5l-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

type CellValue = string | 'check' | 'x'

interface FeatureRow {
  feature: string
  free: CellValue
  pro: CellValue
  team: CellValue
  enterprise: CellValue
}

const FEATURE_ROWS: FeatureRow[] = [
  { feature: 'Storage',       free: '5 GB',      pro: '50 GB',      team: '200 GB',   enterprise: 'Unlimited' },
  { feature: 'Bandwidth/mo',  free: '10 GB',     pro: '100 GB',     team: '500 GB',   enterprise: 'Unlimited' },
  { feature: 'Max file size', free: '4 MB',      pro: '512 MB',     team: '5 GB',     enterprise: '10 GB' },
  { feature: 'Uploads/mo',    free: '1,000',     pro: '10,000',     team: '50,000',   enterprise: 'Unlimited' },
  { feature: 'Projects',      free: '2',         pro: '10',         team: '50',       enterprise: 'Unlimited' },
  { feature: 'API keys',      free: '2',         pro: '10',         team: '50',       enterprise: 'Unlimited' },
  { feature: 'BYOS support',  free: 'check',     pro: 'check',      team: 'check',    enterprise: 'check' },
  { feature: 'Custom CDN domain', free: 'x',    pro: 'check',      team: 'check',    enterprise: 'check' },
  { feature: 'Analytics',     free: 'Basic',     pro: 'Advanced',   team: 'Advanced', enterprise: 'Custom' },
  { feature: 'Support',       free: 'Community', pro: 'Email',      team: 'Priority', enterprise: 'Dedicated' },
  { feature: 'Webhooks',      free: 'x',         pro: 'check',      team: 'check',    enterprise: 'check' },
  { feature: 'Team members',  free: '1',         pro: '1',          team: '5',        enterprise: 'Custom' },
  { feature: 'SLA',           free: 'x',         pro: 'x',          team: '99.9%',    enterprise: '99.99%' },
  { feature: 'SOC 2',         free: 'x',         pro: 'x',          team: 'x',        enterprise: 'check' },
]

function Cell({ value }: { value: CellValue }) {
  if (value === 'check') return <CheckIcon />
  if (value === 'x') return <XIcon />
  return <span className="matrix-text">{value}</span>
}

export function ComparisonMatrix() {
  return (
    <section className="comparison-matrix-section">
      <div className="container">
        <div className="section-header">
          <p className="section-label">Compare plans</p>
          <h2 className="section-title">Everything you get</h2>
          <p className="section-subtitle">
            A full breakdown of features across every plan — no hidden limits.
          </p>
        </div>

        <div className="matrix-wrapper">
          <div className="matrix-scroll">
            <table className="matrix-table">
              <thead>
                <tr className="matrix-header-row">
                  <th className="matrix-th matrix-th--feature">Feature</th>
                  <th className="matrix-th">Free</th>
                  {/* Pro column is highlighted as popular */}
                  <th className="matrix-th matrix-th--pro">
                    <span className="matrix-th-inner">Pro</span>
                  </th>
                  <th className="matrix-th">Team</th>
                  <th className="matrix-th">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={[
                      'matrix-row',
                      i % 2 === 1 ? 'matrix-row--alt' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="matrix-td matrix-td--feature">{row.feature}</td>
                    <td className="matrix-td">
                      <Cell value={row.free} />
                    </td>
                    <td className="matrix-td matrix-td--pro">
                      <Cell value={row.pro} />
                    </td>
                    <td className="matrix-td">
                      <Cell value={row.team} />
                    </td>
                    <td className="matrix-td">
                      <Cell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
