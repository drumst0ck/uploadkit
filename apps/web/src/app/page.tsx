import type { Metadata } from 'next'
import { SkipLink } from '@/components/home/skip-link'
import { Reveal } from '@/components/home/reveal'
import { Pricing } from '@/components/home/pricing'
import { Byos, Closing, Components, Faq, Footer, Header, Hero, HowItWorks, ImageTransforms, Mcp, TryIt } from '@/components/home/sections'
import { JsonLd } from '@/components/landing/json-ld'
import { ORGANIZATION, faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'
import '@/components/home/home.css'

export const metadata: Metadata = {
  title: 'UploadKit — Open source file uploads for React & Next.js',
  description:
    'Open-source file upload SDK and 40+ React components for Next.js, Remix and Vite. Managed storage or bring your own S3/R2 bucket. 5 GB free.',
  openGraph: {
    title: 'UploadKit — Open source file uploads for React & Next.js',
    description:
      'Open-source file upload SDK and 40+ React components for Next.js, Remix and Vite. 5 GB free.',
    images: ['/og/home.png'],
    url: 'https://uploadkit.dev',
    type: 'website',
    siteName: 'UploadKit',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UploadKit — Open source file uploads for React & Next.js',
    description:
      'Open-source file upload SDK and 40+ React components for Next.js, Remix and Vite. 5 GB free.',
    images: ['/og/home.png'],
  },
  metadataBase: new URL('https://uploadkit.dev'),
  alternates: { canonical: 'https://uploadkit.dev' },
  keywords: [
    'file upload',
    'react file upload',
    'nextjs file upload',
    'open source file upload',
    'uploadthing alternative',
    'file upload as a service',
    'presigned url',
    'S3 upload',
    'BYOS',
  ],
}

const HOME_FAQ: FaqEntry[] = [
  {
    question: 'What is UploadKit?',
    answer:
      'UploadKit is an open-source file upload platform for developers: a TypeScript SDK, 40+ React components and managed storage on Cloudflare R2, or your own bucket.',
  },
  {
    question: 'Which frameworks does UploadKit support?',
    answer:
      'Next.js App Router through @uploadkitdev/next, and React with Vite. Remix and SvelteKit are set up with npx uploadkit init; SvelteKit gets a server route and the @uploadkitdev/core client, with no Svelte components yet.',
  },
  {
    question: 'What does the free plan include?',
    answer:
      'The free plan includes 5 GB storage, 2 GB bandwidth per month, a 4 MB max file size and 1,000 uploads per month.',
    link: { label: 'See pricing', href: '/pricing' },
  },
  {
    question: 'Can I use my own S3, R2 or MinIO bucket?',
    answer:
      'Yes. With bring your own storage (BYOS) you run a self-hosted handler and point the storage option at your own S3, R2 or MinIO bucket.',
    link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  },
  {
    question: 'Is UploadKit open source?',
    answer: 'Yes. The UploadKit SDK and components are open source under the MIT license.',
    link: { label: 'View on GitHub', href: 'https://github.com/drumst0ck/uploadkit' },
  },
  {
    question: 'How do I migrate from UploadThing?',
    answer:
      'Follow our step-by-step guide to migrate from UploadThing to UploadKit.',
    link: {
      label: 'Read the migration guide',
      href: '/blog/migrate-from-uploadthing-to-uploadkit',
    },
  },
]

// T-08-07: schema is hardcoded constants only — no XSS risk.
function HomeJsonLd() {
  return (
    <JsonLd
      data={graph(
        ORGANIZATION,
        {
          '@type': 'WebSite',
          '@id': 'https://uploadkit.dev/#website',
          url: 'https://uploadkit.dev',
          name: 'UploadKit',
          publisher: { '@id': ORGANIZATION['@id'] },
        },
        {
          '@type': 'SoftwareApplication',
          name: 'UploadKit',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: '0',
            highPrice: '35',
            priceCurrency: 'USD',
            offerCount: '3',
          },
          url: 'https://uploadkit.dev',
          description:
            'File Uploads as a Service for developers. Type-safe SDK with premium React components.',
          license: 'https://opensource.org/licenses/MIT',
          publisher: { '@id': ORGANIZATION['@id'] },
          author: { '@id': ORGANIZATION['@id'] },
        },
        faqJsonLd(HOME_FAQ),
      )}
    />
  )
}

export default function WebPage() {
  return (
    <div className="hm">
      <HomeJsonLd />
      <SkipLink />
      <Header />
      <main id="main">
        <Hero />
        <TryIt />
        <HowItWorks />
        <Components />
        <Byos />
        <ImageTransforms />
        <Mcp />
        <Pricing />
        <Faq items={HOME_FAQ} />
        <Closing />
      </main>
      <Footer />
      <Reveal />
    </div>
  )
}
