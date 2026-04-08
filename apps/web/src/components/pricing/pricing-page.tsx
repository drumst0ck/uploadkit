// Server Component — composes the full pricing page layout.
// Only PricingToggle is a client island — everything else is server-rendered.

import { PricingToggle } from './pricing-toggle'
import { ComparisonMatrix } from './comparison-matrix'
import { OverageSection } from './overage-section'

const FAQ_ITEMS = [
  {
    q: 'Can I change plans anytime?',
    a: 'Yes, upgrade or downgrade instantly from your dashboard. Changes take effect immediately and are prorated.',
  },
  {
    q: 'What happens when I exceed my limits?',
    a: "We'll notify you at 80% usage. Overages are billed at the transparent rates shown above at the end of your billing cycle.",
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'Yes, Pro and Team plans include a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards (Visa, Mastercard, Amex) via Stripe. Bank transfers available on Enterprise.',
  },
]

export function PricingPage() {
  return (
    <>
      {/* Hero header */}
      <section className="pricing-hero">
        <div className="container">
          <div className="pricing-hero-content">
            <h1 className="pricing-hero-title">
              Simple, transparent pricing
            </h1>
            <p className="pricing-hero-subtitle">
              Start free, scale as you grow. No hidden fees. No vendor lock-in.
            </p>
          </div>

          {/* Client island: toggle controls + tier cards */}
          <PricingToggle />
        </div>
      </section>

      {/* Feature comparison matrix */}
      <ComparisonMatrix />

      {/* Overage pricing */}
      <OverageSection />

      {/* FAQ section */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Got questions?</p>
            <h2 className="section-title">Frequently asked</h2>
          </div>

          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="faq-item">
                <summary className="faq-question">{item.q}</summary>
                <p className="faq-answer">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
