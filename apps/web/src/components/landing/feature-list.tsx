import type { ReactNode } from 'react'

export interface FeatureItem {
  title: string
  description: ReactNode
}

/** Grid of title + description cards (reuses .install-card look). */
export function FeatureList({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="landing-features" role="list">
      {items.map((f) => (
        <li key={f.title} className="install-card">
          <h3>{f.title}</h3>
          <p>{f.description}</p>
        </li>
      ))}
    </ul>
  )
}
