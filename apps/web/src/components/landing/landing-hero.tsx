import type { ReactNode } from 'react'
import { SIGN_UP_URL } from '@/lib/links'

interface LandingHeroProps {
  eyebrow: string
  /** h1 content (the only h1 on the page). */
  title: ReactNode
  lead: ReactNode
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function LandingHero({
  eyebrow,
  title,
  lead,
  primaryCta = { label: 'Start for free', href: SIGN_UP_URL },
  secondaryCta = { label: 'Read the docs', href: 'https://docs.uploadkit.dev' },
}: LandingHeroProps) {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="d2-container">
        <span className="eyebrow">{eyebrow}</span>
        <h1 id="landing-hero-title">{title}</h1>
        <p className="lead">{lead}</p>
        <div className="landing-cta-row">
          <a href={primaryCta.href} className="btn btn-primary btn-lg" rel="noopener noreferrer">
            {primaryCta.label}
          </a>
          <a href={secondaryCta.href} className="btn btn-ghost btn-lg" rel="noopener noreferrer">
            {secondaryCta.label}
          </a>
        </div>
      </div>
    </section>
  )
}
