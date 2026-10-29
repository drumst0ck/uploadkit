// Shared site header: used by the home and every other page. Static markup, no client JS.

import Link from 'next/link'
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/links'

export const DOCS = 'https://docs.uploadkit.dev'

/** UploadKit mark in white: no gradient (brand decision S2). */
export function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--pd-color-accent)" />
      <polygon points="16,7 23,17 9,17" fill="var(--pd-color-text-on-accent)" />
      <rect x="9" y="19" width="14" height="4" rx="1.5" fill="var(--pd-color-text-on-accent)" fillOpacity="0.55" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="top" id="top">
      <Link className="brand" href="/" aria-label="UploadKit home">
        <Mark />
        <span>UploadKit</span>
      </Link>
      <nav className="links" aria-label="Primary">
        <a href={DOCS}>Docs</a>
        <Link href="/components">Components</Link>
        <Link href="/pricing">Pricing</Link>
        <a href={SIGN_IN_URL}>Sign in</a>
        <a className="act go" href={SIGN_UP_URL}>Start free</a>
      </nav>
    </header>
  )
}
