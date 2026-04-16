'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'

const NAV_LINKS = [
  { label: 'Features', href: '/#features', external: false },
  { label: 'Pricing', href: '/#pricing', external: false },
  { label: 'Docs', href: 'https://docs.uploadkit.dev', external: true },
  { label: 'Blog', href: '/blog', external: false },
  { label: 'Changelog', href: '/changelog', external: false },
] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

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
            onClick={close}
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
            <a
              href="https://github.com/drumst0ck/uploadkit"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="UploadKit on GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#71717A] transition-colors duration-200 hover:bg-white/[0.06] hover:text-[var(--color-text-primary)]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
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

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-surface-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-white/[0.06] md:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile slide-in panel */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{
            background: 'rgba(9,9,11,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav className="flex flex-1 flex-col gap-1 px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
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
                onClick={close}
                className="rounded-[var(--radius-sm)] border border-[var(--color-surface-border)] px-4 py-3 text-center text-sm text-[var(--color-text-primary)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Log in
              </Link>
              <Link
                href="https://app.uploadkit.dev/login"
                onClick={close}
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
      )}
    </>
  )
}
