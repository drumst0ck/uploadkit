'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { DesignIcon } from '@/components/ui/design-icon'
import { usePreferences } from '@/components/tweaks/use-preferences'

const NAV_LINKS = [
  { label: 'Features', href: '/#features', external: false },
  { label: 'Components', href: '/#components', external: false },
  { label: 'Docs', href: 'https://docs.uploadkit.dev', external: true },
  { label: 'Pricing', href: '/pricing', external: false },
  { label: 'Changelog', href: '/changelog', external: false },
] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme, ready } = usePreferences()

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
    <div data-surface="design-v2">
      <nav className="nav" aria-label="Main navigation">
        <div className="d2-container nav-inner">
          <div className="nav-left">
            <Link href="/" className="brand" aria-label="UploadKit home" onClick={close}>
              <span className="brand-mark">
                <DesignIcon name="upload" size={12} />
              </span>
              uploadkit
              <span className="brand-beta">v1.0</span>
            </Link>

            <ul className="nav-links" role="list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    {...(link.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="icon-btn nav-desktop-only"
              aria-label={
                ready && theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              onClick={toggleTheme}
            >
              {/* Before hydration we render the moon (matches default dark theme) to avoid
                  mismatch — server renders moon, client corrects on effect if needed. */}
              <DesignIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </button>
            <a
              className="icon-btn nav-desktop-only"
              href="https://github.com/drumst0ck/uploadkit"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="UploadKit on GitHub"
            >
              <DesignIcon name="gh" size={15} />
            </a>
            <Link
              href="https://app.uploadkit.dev/login"
              className="btn btn-ghost nav-desktop-only"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in
            </Link>
            <Link
              href="https://app.uploadkit.dev/login"
              className="btn btn-primary nav-desktop-only"
              target="_blank"
              rel="noopener noreferrer"
            >
              Start building <DesignIcon name="arrow" size={13} />
            </Link>

            {/* Mobile hamburger — visible only on narrow viewports (CSS utility below) */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="icon-btn md:hidden"
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in panel */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{
            background: 'color-mix(in oklab, var(--bg) 97%, transparent)',
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
                className="rounded-md px-3 py-3 text-base"
                style={{ color: 'var(--fg)' }}
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                className="icon-btn"
                aria-label={
                  ready && theme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
                onClick={toggleTheme}
              >
                <DesignIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
              </button>
              <a
                className="icon-btn"
                href="https://github.com/drumst0ck/uploadkit"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="UploadKit on GitHub"
                onClick={close}
              >
                <DesignIcon name="gh" size={15} />
              </a>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="https://app.uploadkit.dev/login"
                onClick={close}
                className="btn btn-ghost"
                style={{ justifyContent: 'center' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Sign in
              </Link>
              <Link
                href="https://app.uploadkit.dev/login"
                onClick={close}
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Start building
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
