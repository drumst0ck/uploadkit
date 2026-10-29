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
    <section className="col close" aria-labelledby="cta-band-heading">
      <h2 id="cta-band-heading">{title}</h2>
      <p className="soft">{lead}</p>
      <div className="actions" style={{ marginTop: 32 }}>
        <a href={primaryCta.href} className="pd-button pd-button--primary" rel="noopener noreferrer">
          {primaryCta.label}
        </a>
        <a href={secondaryCta.href} className="go" rel="noopener noreferrer">
          {secondaryCta.label}
        </a>
      </div>
    </section>
  )
}
