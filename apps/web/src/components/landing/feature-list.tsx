import type { ReactNode } from 'react'

export interface FeatureItem {
  title: string
  description: ReactNode
}

/** Plain list of title + description pairs: one column, space only, no cards. */
export function FeatureList({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="feat" role="list">
      {items.map((f) => (
        <li key={f.title}>
          <h3>{f.title}</h3>
          <p>{f.description}</p>
        </li>
      ))}
    </ul>
  )
}
