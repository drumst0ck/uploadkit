import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import Navbar from '@/components/nav/navbar'
import { InstallCommand } from '@/components/hero/install-command'
import { TerminalSnippet } from '@/components/hero/terminal-snippet'
import { HeroDropzoneDemo } from '@/components/hero/hero-dropzone-demo'
import { LogosStrip } from '@/components/logos/logos-strip'
import { DesignFeatures } from '@/components/features/design-features'
import { FeatureMosaic } from '@/components/features/feature-mosaic'
import { ByosSection } from '@/components/byos/byos-section'
import { Footer } from '@/components/footer/footer'
import { AnimatedButton } from '@/components/ui/animated-button'
import { LandingShowcase } from '@/components/showcase/landing-showcase'
import { McpSection } from '@/components/mcp/mcp-section'
import { TweaksPanel } from '@/components/tweaks/tweaks-panel'
import { DesignIcon } from '@/components/ui/design-icon'

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
// Hero (Claude Design)
// ─────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <div className="d2-container">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">v1.0 · 5 GB free forever</span>
            <h1 id="hero-headline">
              File uploads <br />
              for developers,
              <br />
              <em>done right.</em>
            </h1>
            <p className="lead hero-lead">
              Open-source TypeScript SDK, 40+ premium React components, and managed storage on
              Cloudflare R2 — or bring your own bucket. Ship uploads in an afternoon.
            </p>
            <div className="hero-cta">
              <a
                href="https://app.uploadkit.dev/login"
                className="btn btn-primary btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Start for free <DesignIcon name="arrow" size={14} />
              </a>
              <a
                href="https://docs.uploadkit.dev"
                className="btn btn-ghost btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DesignIcon name="code" size={14} /> Read the docs
              </a>
            </div>
            <div className="hero-meta">
              <span>
                <DesignIcon name="check" size={12} /> MIT licensed
              </span>
              <span>
                <DesignIcon name="check" size={12} /> BYOS · S3 · R2 · GCS · B2
              </span>
              <span>
                <DesignIcon name="check" size={12} /> Works with Next, Remix, Vite
              </span>
            </div>
          </div>

          <div>
            <HeroDropzoneDemo />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Install section (Claude Design — 2-col grid with 3 cards)
// ─────────────────────────────────────────────────────────

function InstallSection() {
  return (
    <section id="install" aria-labelledby="install-headline">
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">Zero to uploading</span>
          <h2 id="install-headline" style={{ marginTop: 16 }}>
            Three ways in. Pick whichever hurts least.
          </h2>
        </div>

        <div className="install-grid">
          {/* Primary card — reuses existing InstallCommand (pm tabs + copy feedback).
              Spans both columns on desktop; collapses to single column on mobile. */}
          <div className="install-card install-card-wide">
            <h3>Add to an existing project</h3>
            <p>
              Most people land here with a Next.js app already running. Install the packages, drop
              in a route handler, wrap your layout — done.
            </p>
            <InstallCommand />
          </div>

          <div className="install-card">
            <h3>Use the CLI</h3>
            <p>
              Detects your framework, installs deps, creates the route handler, wraps your layout
              — one command.
            </p>
            <TerminalSnippet
              emphasized="npx"
              command="uploadkit init"
              ariaLabel="Copy uploadkit init command"
            />
          </div>

          <div className="install-card">
            <h3>Starting fresh</h3>
            <p>
              Scaffold a new Next.js, SvelteKit, Remix, or Vite app with UploadKit pre-wired.
            </p>
            <TerminalSnippet
              emphasized="npx"
              command="create-uploadkit-app my-app"
              ariaLabel="Copy create-uploadkit-app command"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Showcase Section (kept — wraps LandingShowcase with a heading)
// ─────────────────────────────────────────────────────────

function ShowcaseSection() {
  return (
    <section id="showcase" aria-labelledby="showcase-headline">
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">Live previews</span>
          <h2 id="showcase-headline" style={{ marginTop: 16 }}>
            Every component, interactive.
          </h2>
          <p className="lead">
            From minimal Stripe-style dropzones to 3D envelopes and vinyl records. Themeable,
            accessible, motion-aware.
          </p>
        </div>
      </div>
      {/* LandingShowcase is intentionally untouched — real @uploadkitdev/react components. */}
      <LandingShowcase />
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Pricing Section (kept — preserves existing tiers so no duplication)
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
    <section id="pricing" aria-labelledby="pricing-headline">
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">Pricing</span>
          <h2 id="pricing-headline" style={{ marginTop: 16 }}>
            Simple, transparent pricing
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-[14px] p-8"
              style={
                tier.featured
                  ? {
                      background: 'var(--bg-card)',
                      border: '1px solid var(--accent)',
                      boxShadow:
                        '0 0 0 1px var(--accent), 0 20px 50px -20px var(--accent-glow)',
                    }
                  : {
                      background: 'var(--bg-card)',
                      border: '1px solid var(--line)',
                    }
              }
            >
              {tier.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Most Popular
                </div>
              )}

              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: tier.featured ? 'var(--accent)' : 'var(--fg-muted)' }}
              >
                {tier.name}
              </p>

              <div className="mb-1 flex items-end gap-1">
                <span
                  className="text-5xl font-medium"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '-0.03em',
                    color: 'var(--fg)',
                  }}
                >
                  {tier.price}
                </span>
                <span className="mb-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  /{tier.period}
                </span>
              </div>

              <p
                className="mb-8 text-sm leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                {tier.description}
              </p>

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

              <div className="mb-6 h-px" style={{ background: 'var(--line)' }} />

              <ul className="flex flex-col gap-3" role="list">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check
                      className="h-4 w-4 flex-shrink-0"
                      style={{
                        color: tier.featured ? 'var(--accent)' : 'var(--fg-dim)',
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
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
// Page
// ─────────────────────────────────────────────────────────

export default function WebPage() {
  return (
    <>
      <JsonLd />
      <Navbar />
      <main data-surface="design-v2">
        <HeroSection />
        <LogosStrip />
        <DesignFeatures />
        <FeatureMosaic />
        <ShowcaseSection />
        <InstallSection />
        <ByosSection />
        <McpSection />
        <PricingSection />
      </main>
      <Footer />
      <TweaksPanel />
    </>
  )
}
