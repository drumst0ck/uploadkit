// Page frame shared by every marketing page: skip link, header, <main>, footer, entrances.
// Styles live in site.css, scoped under .hm.

import type { ReactNode } from 'react'
import { Footer } from './footer'
import { Header } from './header'
import { Reveal } from './reveal'
import { SkipLink } from './skip-link'
import './site.css'

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="hm">
      <SkipLink />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <Reveal />
    </div>
  )
}
