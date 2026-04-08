import type { Metadata } from 'next'
import { PricingPage } from '@/components/pricing/pricing-page'
import Navbar from '@/components/nav/navbar'
import { Footer } from '@/components/footer/footer'

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

export default function PricingRoute() {
  return (
    <>
      <PricingJsonLd />
      <Navbar />
      <main>
        <PricingPage />
      </main>
      <Footer />
    </>
  )
}
