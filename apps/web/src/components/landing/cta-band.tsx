import { SIGN_UP_URL } from '@/lib/links'

interface CtaBandProps {
  title?: string
  lead?: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function CtaBand({
  title = 'Ship file uploads today',
  lead = 'Start on the free plan: 5 GB storage, 2 GB bandwidth per month, no credit card.',
  primaryCta = { label: 'Start for free', href: SIGN_UP_URL },
  secondaryCta = { label: 'Read the docs', href: 'https://docs.uploadkit.dev' },
}: CtaBandProps) {
  return (
    <section aria-labelledby="cta-band-heading">
      <div className="d2-container">
        <div className="landing-cta-band">
          <h2 id="cta-band-heading">{title}</h2>
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
      </div>
    </section>
  )
}
