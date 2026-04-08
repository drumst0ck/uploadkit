import Link from 'next/link'

// Server Component — zero client JS for the nav itself.
// Mobile menu uses CSS :target trick for zero-JS toggle.
export default function Navbar() {
  return (
    <>
      <header className="navbar-backdrop sticky top-0 z-50">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-[var(--color-text-primary)] no-underline"
            aria-label="UploadKit home"
          >
            {/* Indigo accent dot */}
            <span
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
              aria-hidden="true"
              style={{ boxShadow: '0 0 8px 2px var(--color-accent-glow)' }}
            />
            UploadKit
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden items-center gap-8 md:flex" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-text-primary)]"
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
              className="text-sm text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in
            </Link>
            <Link
              href="https://app.uploadkit.dev/login"
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--color-accent-hover)]"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                boxShadow: '0 0 0 0 var(--color-accent-glow)',
                transition: 'background-color 200ms ease-out, box-shadow 200ms ease-out',
              }}
            >
              Get started
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
        style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)' }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            UploadKit
          </span>
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
              Sign in
            </Link>
            <Link
              href="https://app.uploadkit.dev/login"
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-medium text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </div>
    </>
  )
}

const NAV_LINKS = [
  { label: 'Features', href: '/#features', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
  { label: 'Docs', href: 'https://docs.uploadkit.dev', external: true },
  { label: 'GitHub', href: 'https://github.com/uploadkit', external: true },
] as const
