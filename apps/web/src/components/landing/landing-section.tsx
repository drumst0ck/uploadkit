import type { ReactNode } from 'react'

interface LandingSectionProps {
  id?: string
  eyebrow?: string
  title: string
  lead?: ReactNode
  children: ReactNode
}

/** Generic section: section-head (eyebrow/h2/lead) + body inside d2-container. */
export function LandingSection({ id, eyebrow, title, lead, children }: LandingSectionProps) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section id={id} aria-labelledby={headingId}>
      <div className="d2-container">
        <div className="section-head">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={headingId} style={eyebrow ? { marginTop: 16 } : undefined}>
            {title}
          </h2>
          {lead && <p className="lead">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
