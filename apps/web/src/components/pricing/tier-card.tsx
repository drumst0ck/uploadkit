// Server-compatible component — no "use client"
// Receives yearly boolean as prop from PricingToggle (client island)

import { TIERS_DATA, formatBytes, formatNumber } from '@/lib/tier-data'

type TierData = (typeof TIERS_DATA)[number]

interface TierCardProps {
  tier: TierData
  yearly: boolean
}

export function TierCard({ tier, yearly }: TierCardProps) {
  const isEnterprise = tier.slug === 'enterprise'
  const isPopular = tier.popular

  // Calculate display price
  const price = yearly ? tier.price.yearly : tier.price.monthly
  const originalMonthlyPrice = tier.price.monthly

  // Format price for display
  const displayPrice =
    isEnterprise || price === null ? null : price === 0 ? 0 : price

  return (
    <div
      className={[
        'tier-card',
        isPopular ? 'tier-card--popular' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isPopular && (
        <div className="tier-badge">Most Popular</div>
      )}

      {/* Card header */}
      <div className="tier-card-header">
        <span className="tier-name">{tier.name}</span>

        {/* Price display */}
        <div className="tier-price">
          {isEnterprise ? (
            <span className="tier-price-custom">Custom</span>
          ) : (
            <>
              <div className="tier-price-main">
                <span className="tier-currency">$</span>
                <span className="tier-amount">{displayPrice}</span>
                <span className="tier-period">/mo</span>
              </div>
              {yearly && price !== null && originalMonthlyPrice !== null && originalMonthlyPrice > 0 && (
                <div className="tier-price-note">
                  <span className="tier-price-original">${originalMonthlyPrice}/mo</span>
                  <span className="tier-price-billed">billed annually</span>
                </div>
              )}
              {!yearly && price === 0 && (
                <div className="tier-price-note">
                  <span className="tier-price-billed">free forever</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enterprise extra description */}
        {isEnterprise && (
          <p className="tier-enterprise-desc">
            Everything in Team, plus:
          </p>
        )}
      </div>

      {/* Limits */}
      <ul className="tier-limits">
        {isEnterprise ? (
          <>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Storage</span>
              <span className="tier-limit-value">Unlimited</span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Uploads/mo</span>
              <span className="tier-limit-value">Unlimited</span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Max file size</span>
              <span className="tier-limit-value">10 GB</span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Projects</span>
              <span className="tier-limit-value">Unlimited</span>
            </li>
          </>
        ) : (
          <>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Storage</span>
              <span className="tier-limit-value">
                {formatBytes(tier.limits.maxStorageBytes)}
              </span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Uploads/mo</span>
              <span className="tier-limit-value">
                {formatNumber(tier.limits.maxUploadsPerMonth)}
              </span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Max file size</span>
              <span className="tier-limit-value">
                {formatBytes(tier.limits.maxFileSizeBytes)}
              </span>
            </li>
            <li className="tier-limit-item">
              <span className="tier-limit-label">Projects</span>
              <span className="tier-limit-value">
                {formatNumber(tier.limits.maxProjects)}
              </span>
            </li>
          </>
        )}
      </ul>

      {/* Enterprise feature bullets */}
      {isEnterprise && (
        <ul className="tier-enterprise-features">
          <li>Custom SLA (99.99% uptime)</li>
          <li>SOC 2 Type II report</li>
          <li>Dedicated support channel</li>
          <li>Custom contract & invoicing</li>
        </ul>
      )}

      {/* CTA */}
      <a
        href={tier.ctaHref}
        className={[
          'tier-cta',
          isPopular ? 'tier-cta--primary' : 'tier-cta--secondary',
        ].join(' ')}
      >
        {tier.cta}
      </a>
    </div>
  )
}
