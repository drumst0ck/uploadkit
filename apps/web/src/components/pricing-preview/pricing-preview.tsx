import Link from 'next/link'
import { TIERS_DATA, formatBytes, formatNumber } from '@/lib/tier-data'

// Server Component — no "use client"
// Only renders Free, Pro, Team — Enterprise is on the /pricing page

export function PricingPreview() {
  // Exclude Enterprise from the preview (slug 'enterprise')
  const previewTiers = TIERS_DATA.filter((t) => t.slug !== 'enterprise')

  return (
    <section id="pricing" className="pricing-section">
      <div className="container">
        <div className="section-header" data-animate>
          <p className="section-label">Pricing</p>
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-subtitle">Start free. Scale as you grow.</p>
        </div>

        <div className="pricing-grid stagger-grid" data-animate>
          {previewTiers.map((tier, i) => (
            <article
              key={tier.slug}
              className={`pricing-card${tier.popular ? ' pricing-card--popular' : ''}`}
              style={{ '--index': i } as React.CSSProperties}
            >
              {tier.popular && (
                <div className="pricing-badge" aria-label="Most popular plan">
                  Most Popular
                </div>
              )}

              <div className="pricing-card-header">
                <h3 className="pricing-tier-name">{tier.name}</h3>
                <div className="pricing-price">
                  {tier.price.monthly === 0 ? (
                    <span className="pricing-amount">Free</span>
                  ) : (
                    <>
                      <span className="pricing-currency">$</span>
                      <span className="pricing-amount">{tier.price.monthly}</span>
                      <span className="pricing-period">/mo</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="pricing-limits" aria-label={`${tier.name} plan limits`}>
                <li>
                  <span className="pricing-limit-label">Storage</span>
                  <span className="pricing-limit-value">
                    {formatBytes(tier.limits.maxStorageBytes)}
                  </span>
                </li>
                <li>
                  <span className="pricing-limit-label">Uploads/mo</span>
                  <span className="pricing-limit-value">
                    {formatNumber(tier.limits.maxUploadsPerMonth)}
                  </span>
                </li>
                <li>
                  <span className="pricing-limit-label">Max file size</span>
                  <span className="pricing-limit-value">
                    {formatBytes(tier.limits.maxFileSizeBytes)}
                  </span>
                </li>
                <li>
                  <span className="pricing-limit-label">Bandwidth</span>
                  <span className="pricing-limit-value">
                    {formatBytes(tier.limits.maxBandwidthBytes)}
                  </span>
                </li>
              </ul>

              <a
                href={tier.ctaHref}
                className={`pricing-cta${tier.popular ? ' pricing-cta--primary' : ' pricing-cta--secondary'}`}
                rel={tier.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {tier.cta}
              </a>
            </article>
          ))}
        </div>

        <div className="pricing-footer" data-animate>
          <Link href="/pricing" className="pricing-all-plans">
            See all plans, including Enterprise
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
