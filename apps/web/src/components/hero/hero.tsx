import Link from 'next/link'
import HeroCode from './hero-code'

// Server Component — zero client JS (D-03, D-04)
export default function Hero() {
  return (
    <section
      className="gradient-mesh relative overflow-hidden py-24 md:py-32 lg:py-40"
      aria-labelledby="hero-headline"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Content column — centered layout */}
        <div className="flex flex-col items-center text-center">

          {/* "5GB free forever" badge */}
          <div
            className="badge-glow mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--color-accent-hover)',
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
              aria-hidden="true"
            />
            5GB free forever
          </div>

          {/* Headline */}
          <h1
            id="hero-headline"
            className="mb-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            File uploads for developers.{' '}
            <span style={{ color: 'var(--color-accent)' }}>Done right.</span>
          </h1>

          {/* Subheadline */}
          <p
            className="mb-10 max-w-2xl text-lg md:text-xl"
            style={{
              color: 'var(--color-text-secondary)',
              lineHeight: '1.7',
            }}
          >
            Add beautiful, type-safe file uploads to your app in minutes.
            Free tier included — no credit card required.
          </p>

          {/* CTAs */}
          <div className="mb-16 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="https://app.uploadkit.dev/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] px-6 py-3 text-sm font-semibold text-white transition-all duration-200"
              style={{
                background: 'var(--color-accent)',
                boxShadow: '0 0 20px -5px var(--color-accent-glow)',
              }}
            >
              Get started free
            </Link>
            <Link
              href="https://docs.uploadkit.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] px-6 py-3 text-sm font-medium transition-colors duration-200"
              style={{
                border: '1px solid var(--color-surface-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              View docs
              <svg
                aria-hidden="true"
                className="ml-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Animated code snippet */}
          <div className="w-full max-w-2xl text-left">
            <HeroCode />
          </div>

          {/* Social proof nudge */}
          <p className="mt-6 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            TypeScript-first · Zero vendor lock-in · Open source SDK
          </p>
        </div>
      </div>
    </section>
  )
}
