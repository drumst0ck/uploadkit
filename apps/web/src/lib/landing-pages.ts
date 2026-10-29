// Registry of marketing landing pages. Drives sitemap.ts and the footer.
// PAGE AUTHORS: when you add the page for an entry, flip `live` to true in the same
// change — non-live entries are excluded from the sitemap and footer to avoid 404 links.

export type LandingGroup = 'compare' | 'frameworks' | 'product'

export interface LandingPage {
  path: string
  /** Nav / footer label. */
  title: string
  group: LandingGroup
  live: boolean
}

export const LANDING_PAGES: LandingPage[] = [
  { path: '/vs/uploadthing', title: 'vs UploadThing', group: 'compare', live: true },
  { path: '/vs/uploadcare', title: 'vs Uploadcare', group: 'compare', live: true },
  { path: '/vs/filestack', title: 'vs Filestack', group: 'compare', live: true },
  { path: '/vs/bytescale', title: 'vs Bytescale', group: 'compare', live: true },
  { path: '/nextjs', title: 'Next.js', group: 'frameworks', live: true },
  { path: '/remix', title: 'Remix', group: 'frameworks', live: true },
  { path: '/sveltekit', title: 'SvelteKit', group: 'frameworks', live: true },
  { path: '/vite', title: 'Vite', group: 'frameworks', live: true },
  { path: '/byos', title: 'Bring your own storage', group: 'product', live: true },
  { path: '/components', title: 'React components', group: 'product', live: true },
]

export function livePagesByGroup(group: LandingGroup): LandingPage[] {
  return LANDING_PAGES.filter((p) => p.live && p.group === group)
}
