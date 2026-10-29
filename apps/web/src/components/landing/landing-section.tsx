import type { ReactNode } from 'react'

interface LandingSectionProps {
  id?: string
  title: string
  lead?: ReactNode
  children: ReactNode
}

/** Generic section: a 560px head (h2 + lead) and a body whose prose stays in the column while code and tables may run wider. */
export function LandingSection({ id, title, lead, children }: LandingSectionProps) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section id={id} aria-labelledby={headingId}>
      <div className="col">
        <h2 id={headingId}>{title}</h2>
        {lead && <p className="soft">{lead}</p>}
      </div>
      <div className="sec">{children}</div>
    </section>
  )
}
