// Server Component — no "use client"
// Full feature comparison table across all 4 tiers — sourced from @uploadkitdev/shared

import {
  TIER_FEATURES,
  TIER_LIMITS,
  formatImageTransformLimit,
  formatTeamMemberLimit,
  formatTierLimitValue,
  type Tier,
} from '@uploadkitdev/shared'

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

function boolCell(tier: Tier, enabled: boolean): CellValue {
  return enabled ? 'check' : 'x'
}

function buildFeatureRows(): FeatureRow[] {
  const tiers: Tier[] = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE']
  const keys = ['free', 'pro', 'team', 'enterprise'] as const

  function row(
    feature: string,
    getter: (tier: Tier) => CellValue,
  ): FeatureRow {
    const result = { feature } as FeatureRow
    tiers.forEach((tier, i) => {
      result[keys[i]!] = getter(tier)
    })
    return result
  }

  return [
    row('Storage', (t) => formatTierLimitValue(t, 'maxStorageBytes')),
    row('Bandwidth/mo', (t) => formatTierLimitValue(t, 'maxBandwidthBytes')),
    row('Max file size', (t) => formatTierLimitValue(t, 'maxFileSizeBytes')),
    row('Uploads/mo', (t) => formatTierLimitValue(t, 'maxUploadsPerMonth')),
    row('Image transforms/mo', (t) => formatImageTransformLimit(t)),
    row('Projects', (t) => formatTierLimitValue(t, 'maxProjects')),
    row('API keys', (t) => formatTierLimitValue(t, 'maxApiKeys')),
    row('Custom CDN domain', (t) => boolCell(t, TIER_FEATURES[t].customCdnDomain)),
    row('Analytics', (t) =>
      TIER_FEATURES[t].advancedAnalytics ? 'Advanced' : 'Basic',
    ),
    row('Support', (t) => TIER_FEATURES[t].support),
    row('Webhooks', (t) => boolCell(t, TIER_FEATURES[t].webhooks)),
    row('Team members', (t) => formatTeamMemberLimit(t)),
    row('SLA', (t) => TIER_FEATURES[t].sla ?? 'x'),
    row('SOC 2', (t) => boolCell(t, TIER_FEATURES[t].soc2)),
  ]
}

const FEATURE_ROWS = buildFeatureRows()

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

// Re-export for tests that assert limits match TIER_LIMITS
export { TIER_LIMITS }
