import type { ReactNode } from 'react'
import Navbar from '@/components/nav/navbar'
import { Footer } from '@/components/footer/footer'

/** Navbar + design-v2 <main> + Footer. Children are the page sections. */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main data-surface="design-v2">{children}</main>
      <Footer />
    </>
  )
}
