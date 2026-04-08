import type { Metadata } from 'next'
import Navbar from '@/components/nav/navbar'
import Hero from '@/components/hero/hero'
import { CodeDemo } from '@/components/code-demo/code-demo'
import { FeaturesGrid } from '@/components/features/features-grid'
import { ComparisonTable } from '@/components/comparison/comparison-table'
import { ComponentShowcase } from '@/components/showcase/component-showcase'
import { PricingPreview } from '@/components/pricing-preview/pricing-preview'
import { Footer } from '@/components/footer/footer'
import { AnimateObserver } from '@/components/shared/animate-observer'

export const metadata: Metadata = {
  title: 'UploadKit — File Uploads for Developers. Done right.',
  description:
    'Add beautiful, type-safe file uploads to your app in minutes. 5GB free forever. BYOS support. Premium React components. No vendor lock-in.',
  openGraph: {
    title: 'UploadKit',
    description: 'File uploads as a service. 5GB free forever.',
    images: ['/og/home.png'],
    url: 'https://uploadkit.dev',
    type: 'website',
    siteName: 'UploadKit',
  },
  twitter: { card: 'summary_large_image', images: ['/og/home.png'] },
  metadataBase: new URL('https://uploadkit.dev'),
  alternates: { canonical: 'https://uploadkit.dev' },
  keywords: [
    'file upload',
    'react file upload',
    'nextjs file upload',
    'uploadthing alternative',
    'file upload as a service',
    'presigned url',
    'S3 upload',
    'BYOS',
  ],
}

// T-08-07: schema is hardcoded constants only, not user input.
// JSON.stringify escapes special characters — no XSS risk.
function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'UploadKit',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '35',
      priceCurrency: 'USD',
      offerCount: '4',
    },
    url: 'https://uploadkit.dev',
    description:
      'File Uploads as a Service for developers. Type-safe SDK with premium React components.',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Server Component — only CodeDemoClient, ComponentShowcase, AnimateObserver ship JS
export default function WebPage() {
  return (
    <>
      <JsonLd />
      <Navbar />
      <main>
        <Hero />
        <CodeDemo />
        <FeaturesGrid />
        <ComparisonTable />
        <ComponentShowcase />
        <PricingPreview />
      </main>
      <Footer />
      <AnimateObserver />
    </>
  )
}
