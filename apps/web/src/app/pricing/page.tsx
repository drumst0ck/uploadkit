import type { Metadata } from 'next'
import { Pricing } from '@/components/home/pricing'
import { Faq } from '@/components/home/sections'
import { SiteShell } from '@/components/site/shell'
import type { FaqEntry } from '@/lib/json-ld'

export const metadata: Metadata = {
  title: 'Pricing — UploadKit',
  description:
    'Simple, transparent pricing for file uploads. Start free with 5GB storage. Scale with Pro ($15/mo) or Team ($35/mo) plans.',
  openGraph: {
    title: 'UploadKit Pricing',
    description: 'File uploads as a service. 5GB free forever. Pro from $15/mo.',
    images: ['/og/pricing.png'],
    url: 'https://uploadkit.dev/pricing',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og/pricing.png'] },
  alternates: { canonical: 'https://uploadkit.dev/pricing' },
}

function PricingJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'UploadKit',
    description: 'File Uploads as a Service',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '15',
        priceCurrency: 'USD',
        billingIncrement: 'P1M',
      },
      {
        '@type': 'Offer',
        name: 'Team',
        price: '35',
        priceCurrency: 'USD',
        billingIncrement: 'P1M',
      },
    ],
    url: 'https://uploadkit.dev/pricing',
  }
  return (
    <script
      type="application/ld+json"
      // T-08-07: schema is hardcoded constants only, not user input.
      // JSON.stringify escapes special characters — no XSS risk.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

const FAQ_ITEMS: FaqEntry[] = [
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes, upgrade or downgrade instantly from your dashboard. Changes take effect immediately and are prorated.',
  },
  {
    question: 'What happens when I exceed my limits?',
    answer: "We'll notify you at 80% usage. Overages are billed at the transparent rates shown above at the end of your billing cycle.",
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'Yes, Pro and Team plans include a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'All major credit cards (Visa, Mastercard, Amex) via Stripe. Bank transfers available on Enterprise.',
  },
]

export default function PricingRoute() {
  return (
    <SiteShell>
      <PricingJsonLd />
      <Pricing standalone />
      <Faq items={FAQ_ITEMS} title="Frequently asked" />
    </SiteShell>
  )
}
