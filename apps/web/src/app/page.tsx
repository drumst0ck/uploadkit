import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CloudUpload,
  HardDrive,
  Palette,
  Shield,
  Zap,
  LayoutDashboard,
  Check,
  ArrowRight,
  Copy,
} from 'lucide-react'
import Navbar from '@/components/nav/navbar'
import { Logo } from '@/components/logo'
import { HeroCodeWindow } from '@/components/hero/hero-code-window'
import { Footer } from '@/components/footer/footer'
import { BlurText } from '@/components/react-bits/blur-text'
import { Aurora } from '@/components/react-bits/aurora'
import { SpotlightCard } from '@/components/react-bits/spotlight-card'

export const metadata: Metadata = {
  title: 'UploadKit — The developer platform for file uploads',
  description:
    'UploadKit provides the infrastructure, SDK, and components to add production-ready file uploads to any app. 5GB free forever.',
  openGraph: {
    title: 'UploadKit',
    description: 'The developer platform for file uploads. 5GB free forever.',
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

// T-08-07: schema is hardcoded constants only — no XSS risk.
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
      offerCount: '3',
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

// ─────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────

async function HeroSection() {
  return (
    <section
      className="gradient-mesh relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36"
      aria-labelledby="hero-headline"
    >
      {/* Aurora WebGL background — sits behind gradient-mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_0%,transparent_75%)]"
        aria-hidden="true"
      >
        <Aurora
          colorStops={['#6366f1', '#818cf8', '#3b82f6']}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 text-center">
        {/* Beta badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.30)',
            color: '#818cf8',
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: '#818cf8' }}
            aria-hidden="true"
          />
          Now in beta — 5GB free forever
        </div>

        {/* Headline — BlurText staggered reveal */}
        <h1
          id="hero-headline"
          className="mb-6 flex max-w-[720px] flex-col items-center font-display font-black leading-[1.05]"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(42px, 6vw, 68px)',
            letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)',
          }}
        >
          <BlurText
            as="span"
            text="The developer platform"
            delay={80}
            animateBy="words"
            direction="top"
            className="justify-center"
          />
          <BlurText
            as="span"
            text="for file uploads"
            delay={80}
            animateBy="words"
            direction="top"
            className="justify-center"
          />
        </h1>

        {/* Subline */}
        <p
          className="mb-10 max-w-[580px] text-lg"
          style={{ color: '#71717A', lineHeight: '1.75' }}
        >
          UploadKit provides the infrastructure, SDK, and components to add
          production-ready file uploads to any app — in minutes.
        </p>

        {/* CTAs */}
        <div className="mb-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="https://app.uploadkit.dev/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(250,250,250,0.4)] active:scale-[0.98]"
            style={{ background: '#fafafa', color: '#09090b', boxShadow: '0 0 20px -5px rgba(250,250,250,0.3)' }}
          >
            Start Building
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="https://docs.uploadkit.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-6 py-2.5 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/[0.06]"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#a1a1aa',
            }}
          >
            Read the Docs
          </Link>
        </div>

        {/* Install command pill */}
        <div
          className="mb-14 flex items-center gap-3 rounded-full px-5 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <code
            className="font-mono text-sm"
            style={{ color: '#a1a1aa' }}
          >
            $ pnpm add @uploadkitdev/next @uploadkitdev/react
          </code>
          <button
            type="button"
            aria-label="Copy install command"
            className="flex-shrink-0 transition-all duration-200 hover:text-zinc-300 hover:bg-white/[0.06] rounded-md p-1 -m-1"
            style={{ color: '#52525B' }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Code window */}
        <div className="w-full max-w-[720px]">
          <HeroCodeWindow />
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Features Section
// ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: CloudUpload,
    title: 'Managed Storage',
    description:
      'Upload files directly to UploadKit-managed S3-compatible storage. CDN delivery included, no infrastructure setup required.',
  },
  {
    icon: HardDrive,
    title: 'Bring Your Own Storage',
    description:
      'Point UploadKit at your own S3 bucket, R2, or GCS. Keep your data in your cloud — we just handle the plumbing.',
  },
  {
    icon: Palette,
    title: 'Premium Components',
    description:
      'Drop-in React components — dropzone, button, progress bar — styled beautifully and fully customizable.',
  },
  {
    icon: Shield,
    title: 'End-to-End Type Safety',
    description:
      'Your file router is fully typed. Endpoint names, MIME types, and metadata flow from server to client without casting.',
  },
  {
    icon: Zap,
    title: 'Direct Uploads',
    description:
      'Files go straight from the browser to storage via presigned URLs. Your server never touches the bytes.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard & Analytics',
    description:
      'Monitor uploads, bandwidth, and storage in real time. Set alerts and inspect individual files from one place.',
  },
] as const

function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 md:py-32"
      aria-labelledby="features-headline"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: '#818cf8' }}
          >
            Features
          </p>
          <h2
            id="features-headline"
            className="font-display text-4xl font-black leading-tight md:text-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </h2>
        </div>

        {/* 3×2 grid — SpotlightCard hover */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <SpotlightCard
              key={title}
              spotlightColor="rgba(129, 140, 248, 0.22)"
              className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-white/[0.06] bg-[#0C0C0F] p-6 transition-colors duration-300 hover:border-white/[0.14]"
            >
              {/* Icon container */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: 'rgba(99,102,241,0.12)' }}
              >
                <Icon className="h-5 w-5" style={{ color: '#818cf8' }} aria-hidden="true" />
              </div>
              <h3
                className="font-display text-base font-semibold"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#52525B' }}>
                {description}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Pricing Section
// ─────────────────────────────────────────────────────────

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  cta: string
  ctaHref: string
  featured: boolean
  features: string[]
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for side projects and early-stage apps.',
    cta: 'Get Started Free',
    ctaHref: 'https://app.uploadkit.dev/login',
    featured: false,
    features: [
      '5 GB storage',
      '2 GB bandwidth / mo',
      '4 MB max file size',
      '1,000 uploads / mo',
      '2 projects',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$15',
    period: 'per month',
    description: 'For production apps that need reliable infrastructure.',
    cta: 'Start Pro Trial',
    ctaHref: 'https://app.uploadkit.dev/login',
    featured: true,
    features: [
      '100 GB storage',
      '200 GB bandwidth / mo',
      '512 MB max file size',
      '50,000 uploads / mo',
      '10 projects',
      'Priority email support',
    ],
  },
  {
    name: 'Team',
    price: '$35',
    period: 'per month',
    description: 'For growing teams with higher volume and more projects.',
    cta: 'Start Team Trial',
    ctaHref: 'https://app.uploadkit.dev/login',
    featured: false,
    features: [
      '1 TB storage',
      '2 TB bandwidth / mo',
      '5 GB max file size',
      '500,000 uploads / mo',
      '50 projects',
      'Dedicated support',
    ],
  },
]

function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-24 md:py-32"
      aria-labelledby="pricing-headline"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: '#818cf8' }}
          >
            Pricing
          </p>
          <h2
            id="pricing-headline"
            className="font-display text-4xl font-black leading-tight md:text-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Simple, transparent pricing
          </h2>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-[var(--radius-lg)] p-8"
              style={
                tier.featured
                  ? {
                      background: '#0C0C0F',
                      border: '1px solid rgba(99,102,241,0.5)',
                      boxShadow: '0 0 60px -20px rgba(99,102,241,0.35)',
                    }
                  : {
                      background: '#0C0C0F',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }
              }
            >
              {/* Most Popular badge */}
              {tier.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: '#6366f1', color: '#fff' }}
                >
                  Most Popular
                </div>
              )}

              {/* Tier name */}
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: tier.featured ? '#818cf8' : '#a1a1aa' }}
              >
                {tier.name}
              </p>

              {/* Price */}
              <div className="mb-1 flex items-end gap-1">
                <span
                  className="font-display text-5xl font-black"
                  style={{
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.03em',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {tier.price}
                </span>
                <span className="mb-2 text-sm" style={{ color: '#71717A' }}>
                  /{tier.period}
                </span>
              </div>

              {/* Description */}
              <p className="mb-8 text-sm leading-relaxed" style={{ color: '#71717A' }}>
                {tier.description}
              </p>

              {/* CTA */}
              {tier.featured ? (
                <Link
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-8 w-full rounded-[var(--radius-sm)] py-2.5 text-center text-sm font-semibold transition-all duration-200 bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30"
                >
                  {tier.cta}
                </Link>
              ) : (
                <Link
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-8 w-full rounded-[var(--radius-sm)] py-2.5 text-center text-sm font-semibold transition-all duration-200 border border-white/[0.12] text-white hover:bg-white/[0.06] hover:border-white/[0.18]"
                >
                  {tier.cta}
                </Link>
              )}

              {/* Divider */}
              <div
                className="mb-6 h-px"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />

              {/* Feature list */}
              <ul className="flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: tier.featured ? '#818cf8' : '#52525B' }}
                      aria-hidden="true"
                    />
                    <span className="text-sm" style={{ color: '#a1a1aa' }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Final CTA Section
// ─────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-24 md:py-32" aria-labelledby="cta-headline">
      <div className="mx-auto max-w-[1200px] px-6">
        <div
          className="flex flex-col items-center rounded-[var(--radius-lg)] px-8 py-20 text-center"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.14) 0%, transparent 70%), #0C0C0F',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2
            id="cta-headline"
            className="mb-4 max-w-[500px] font-display font-black leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 44px)',
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
            }}
          >
            Ready to ship uploads?
          </h2>
          <p className="mb-10 text-lg" style={{ color: '#71717A' }}>
            Start with 5GB free. No credit card required.
          </p>
          <Link
            href="https://app.uploadkit.dev/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-8 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(250,250,250,0.4)] active:scale-[0.98]"
            style={{ background: '#fafafa', color: '#09090b', boxShadow: '0 0 20px -5px rgba(250,250,250,0.3)' }}
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default async function WebPage() {
  return (
    <>
      <JsonLd />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
