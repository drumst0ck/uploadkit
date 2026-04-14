import type { Metadata } from 'next'
import {
  CloudUpload,
  HardDrive,
  Palette,
  Shield,
  Zap,
  LayoutDashboard,
  Check,
} from 'lucide-react'
import Navbar from '@/components/nav/navbar'
import { Logo } from '@/components/logo'
import { HeroCodeWindow } from '@/components/hero/hero-code-window'
import { InstallCommand } from '@/components/hero/install-command'
import { Footer } from '@/components/footer/footer'
import { AnimatedButton } from '@/components/ui/animated-button'
import { BlurText } from '@/components/react-bits/blur-text'
import { DarkVeil } from '@/components/react-bits/dark-veil'
import { SpotlightCard } from '@/components/react-bits/spotlight-card'
import { LandingShowcase } from '@/components/showcase/landing-showcase'
import { McpSection } from '@/components/mcp/mcp-section'

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
      className="relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36"
      aria-labelledby="hero-headline"
    >
      {/* DarkVeil — full-section animated gradient background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]"
        aria-hidden="true"
      >
        <DarkVeil
          speed={0.4}
          hueShift={-25}
          warpAmount={0.6}
          noiseIntensity={0.02}
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
          className="mb-6 flex flex-col items-center font-display font-black leading-[1.05]"
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
            className="justify-center whitespace-nowrap"
          />
          <BlurText
            as="span"
            text="for file uploads"
            delay={80}
            animateBy="words"
            direction="top"
            className="justify-center whitespace-nowrap"
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
          <AnimatedButton
            href="https://app.uploadkit.dev/login"
            variant="primary"
            external
          >
            Start Building
          </AnimatedButton>
          <AnimatedButton
            href="https://docs.uploadkit.dev"
            variant="ghost"
            external
          >
            Read the Docs
          </AnimatedButton>
        </div>

        {/* Install command — client component with pm tabs + copy feedback */}
        <InstallCommand />

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
// Component Showcase Section
// ─────────────────────────────────────────────────────────

function ShowcaseSection() {
  return (
    <section
      id="components"
      className="py-24 md:py-32"
      aria-labelledby="showcase-headline"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: '#818cf8' }}
          >
            Components
          </p>
          <h2
            id="showcase-headline"
            className="font-display text-4xl font-black leading-tight md:text-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            40+ upload components.
            <br />
            Pick your style.
          </h2>
          <p
            className="mt-4 max-w-[520px] text-lg"
            style={{ color: '#71717A', lineHeight: '1.75' }}
          >
            From minimal Stripe-style dropzones to 3D envelopes and vinyl
            records. Every component is themeable, accessible, and works with
            or without Motion.
          </p>
        </div>
      </div>

      {/* Showcase — full width for the grid layout */}
      <LandingShowcase />
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
              <div className="mb-8">
                <AnimatedButton
                  href={tier.ctaHref}
                  variant={tier.featured ? 'accent' : 'ghost'}
                  external
                  fullWidth
                  showArrow={false}
                >
                  {tier.cta}
                </AnimatedButton>
              </div>

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
          <AnimatedButton
            href="https://app.uploadkit.dev/login"
            variant="primary"
            external
            className="px-8 py-3"
          >
            Get Started Free
          </AnimatedButton>
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
        <ShowcaseSection />
        <McpSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
