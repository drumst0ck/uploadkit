'use client'

import { useState } from 'react'
import { TIERS_DATA } from '@/lib/tier-data'
import { TierCard } from './tier-card'

export function PricingToggle() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="pricing-toggle-wrapper">
      {/* Toggle control */}
      <div className="toggle-row">
        <span
          className={[
            'toggle-label',
            !yearly ? 'toggle-label--active' : '',
          ].join(' ')}
        >
          Monthly
        </span>

        {/* Accessible switch */}
        <button
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle annual billing"
          onClick={() => setYearly((v) => !v)}
          className={['toggle-track', yearly ? 'toggle-track--on' : ''].join(' ')}
        >
          <span className="toggle-thumb" />
        </button>

        <span
          className={[
            'toggle-label',
            yearly ? 'toggle-label--active' : '',
          ].join(' ')}
        >
          Yearly
        </span>

        {/* Save badge — always visible, highlighted when yearly active */}
        <span
          className={['save-badge', yearly ? 'save-badge--active' : ''].join(
            ' ',
          )}
        >
          Save 20%
        </span>
      </div>

      {/* Tier cards grid */}
      <div className="tier-cards-grid">
        {TIERS_DATA.map((tier) => (
          <TierCard key={tier.slug} tier={tier} yearly={yearly} />
        ))}
      </div>
    </div>
  )
}
