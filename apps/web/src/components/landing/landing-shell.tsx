import type { ReactNode } from 'react'
import { SiteShell } from '@/components/site/shell'

/** Shared site frame (header, <main>, footer). Children are the page sections. */
export function LandingShell({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
