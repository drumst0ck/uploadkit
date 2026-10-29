import type { ReactNode } from 'react'

export interface ComparisonRow {
  feature: string
  us: ReactNode
  them: ReactNode
  note?: ReactNode
}

interface ComparisonTableProps {
  caption: string
  usLabel?: string
  themLabel: string
  rows: ComparisonRow[]
}

/** Accessible comparison <table>. Only put verifiable facts in `them`. */
export function ComparisonTable({
  caption,
  usLabel = 'UploadKit',
  themLabel,
  rows,
}: ComparisonTableProps) {
  const hasNotes = rows.some((r) => r.note)
  return (
    <div className="pd-table-wrap cmp-wrap" data-ui tabIndex={0} role="group" aria-label={caption}>
      <table className="pd-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">{usLabel}</th>
            <th scope="col">{themLabel}</th>
            {hasNotes && <th scope="col">Notes</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <th scope="row">{r.feature}</th>
              <td>{r.us}</td>
              <td>{r.them}</td>
              {hasNotes && <td>{r.note}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
