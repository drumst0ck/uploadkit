// Server Component — no "use client"

// Inline SVG check icon (green)
function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check-icon"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Inline SVG X icon (muted)
function XIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="x-icon"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

type CellValue = 'check' | 'x' | string

interface ComparisonRow {
  feature: string
  uploadkit: CellValue
  others: CellValue
}

const rows: ComparisonRow[] = [
  { feature: 'Free storage',            uploadkit: '5 GB',      others: '2 GB' },
  { feature: 'BYOS (bring your bucket)',uploadkit: 'check',     others: 'x' },
  { feature: 'Open-source SDK',         uploadkit: 'check',     others: 'x' },
  { feature: 'Zero egress fees',        uploadkit: 'check',     others: 'x' },
  { feature: 'Direct uploads (presigned URLs)', uploadkit: 'check', others: 'check' },
  { feature: 'Premium React components',uploadkit: 'check',     others: 'check' },
  { feature: 'Type-safe file router',   uploadkit: 'check',     others: 'x' },
  { feature: 'Max file size (free)',    uploadkit: '4 MB',      others: '4 MB' },
  { feature: 'Built-in dashboard',      uploadkit: 'check',     others: 'check' },
  { feature: 'Vendor lock-in',          uploadkit: 'None',      others: 'High' },
]

function Cell({ value }: { value: CellValue }) {
  if (value === 'check') return <CheckIcon />
  if (value === 'x') return <XIcon />
  return <span className="cell-text">{value}</span>
}

export function ComparisonTable() {
  return (
    <section id="comparison" className="comparison-section">
      <div className="container">
        <div className="section-header" data-animate>
          <p className="section-label">Comparison</p>
          <h2 className="section-title">How we compare</h2>
          <p className="section-subtitle">
            See why developers choose UploadKit for production file uploads.
          </p>
        </div>

        <div className="comparison-wrapper" data-animate>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col" className="col-feature">Feature</th>
                  <th scope="col" className="col-uploadkit">
                    <span className="col-uploadkit-inner">
                      UploadKit
                      <span className="col-badge">Us</span>
                    </span>
                  </th>
                  <th scope="col" className="col-others">Others</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="col-feature">{row.feature}</td>
                    <td className="col-uploadkit">
                      <Cell value={row.uploadkit} />
                    </td>
                    <td className="col-others">
                      <Cell value={row.others} />
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
