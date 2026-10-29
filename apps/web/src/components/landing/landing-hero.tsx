import type { ReactNode } from 'react'
import { SIGN_UP_URL } from '@/lib/links'

interface LandingHeroProps {
  /** h1 content (the only h1 on the page). */
  title: ReactNode
  lead: ReactNode
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function LandingHero({
  title,
  lead,
  primaryCta = { label: 'Start for free', href: SIGN_UP_URL },
  secondaryCta = { label: 'Read the docs', href: 'https://docs.uploadkit.dev' },
}: LandingHeroProps) {
  return (
    <section className="page-head" aria-labelledby="landing-hero-title">
      <h1 className="page-title enter" id="landing-hero-title">{title}</h1>
      <div className="col">
        <p className="enter" style={{ '--i': 1 } as React.CSSProperties}>{lead}</p>
        <div className="actions enter" style={{ '--i': 2, marginTop: 32 } as React.CSSProperties}>
          <a href={primaryCta.href} className="pd-button pd-button--primary" rel="noopener noreferrer">
            {primaryCta.label}
          </a>
          <a href={secondaryCta.href} className="go" rel="noopener noreferrer">
            {secondaryCta.label}
          </a>
        </div>
      </div>
    </section>
  )
}
