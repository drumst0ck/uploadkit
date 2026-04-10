'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'

const NAV_LINKS = [
  { label: 'Features', href: '/#features', external: false },
  { label: 'Pricing', href: '/#pricing', external: false },
  { label: 'Docs', href: 'https://docs.uploadkit.dev', external: true },
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
