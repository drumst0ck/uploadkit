import Link from 'next/link'
import { Logo } from '@/components/logo'

// Server Component — zero client JS for the nav itself.
// Mobile menu uses CSS :target trick for zero-JS toggle.
export default function Navbar() {
  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(9,9,11,0.80)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center no-underline"
            aria-label="UploadKit home"
          >
            <Logo size={28} />
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden items-center gap-7 md:flex" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                  style={{ color: '#71717A' }}
                  {...(link.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="https://app.uploadkit.dev/login"
              className="text-sm transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              style={{ color: '#71717A' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Log in
            </Link>
            <Link
              href="https://app.uploadkit.dev/login"
              className="rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(250,250,250,0.25)]"
              style={{
                background: '#fafafa',
                color: '#09090b',
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger — CSS :target technique, zero JS */}
          <a
            href="#mobile-menu"
            aria-label="Open navigation menu"
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md border border-[var(--color-surface-border)] md:hidden"
          >
            <span className="block h-px w-5 bg-[var(--color-text-secondary)]" />
            <span className="block h-px w-5 bg-[var(--color-text-secondary)]" />
            <span className="block h-px w-5 bg-[var(--color-text-secondary)]" />
          </a>
        </nav>
      </header>

      {/* Mobile slide-in panel — CSS :target, no JS required */}
      <div
        id="mobile-menu"
        className="fixed inset-0 z-40 hidden target:flex flex-col"
        style={{ background: 'rgba(9,9,11,0.97)', backdropFilter: 'blur(16px)' }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 py-4">
          <Logo size={26} />
          <a
            href="#"
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-surface-border)] text-[var(--color-text-secondary)]"
          >
            ✕
          </a>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-6 pt-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-sm)] px-3 py-3 text-base text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-elevated)]"
              {...(link.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="https://app.uploadkit.dev/login"
              className="rounded-[var(--radius-sm)] border border-[var(--color-surface-border)] px-4 py-3 text-center text-sm text-[var(--color-text-primary)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Log in
            </Link>
            <Link
              href="https://app.uploadkit.dev/login"
              className="rounded-[var(--radius-sm)] px-4 py-3 text-center text-sm font-semibold"
              style={{ background: '#fafafa', color: '#09090b' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </>
  )
}

const NAV_LINKS = [
  { label: 'Features', href: '/#features', external: false },
  { label: 'Pricing', href: '/#pricing', external: false },
  { label: 'Docs', href: 'https://docs.uploadkit.dev', external: true },
  { label: 'Changelog', href: '/changelog', external: false },
] as const
