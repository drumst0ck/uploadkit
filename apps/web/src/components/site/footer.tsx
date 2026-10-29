// Shared site footer.

import Link from 'next/link'
import { LANDING_PAGES } from '@/lib/landing-pages'
import { DOCS } from './header'

const GITHUB = 'https://github.com/drumst0ck/uploadkit'

const FOOT = [
  { label: 'Docs', href: DOCS },
  { label: 'GitHub', href: GITHUB },
  { label: 'Status', href: '/status' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Dashboard', href: 'https://app.uploadkit.dev' },
  { label: 'Privacy', href: 'https://app.uploadkit.dev/privacy' },
  { label: 'Terms', href: 'https://app.uploadkit.dev/terms' },
  { label: 'Contact', href: 'mailto:support@uploadkit.dev' },
]

// Sitewide internal links from the landing-page registry (framework guides, comparisons, BYOS,
// components) plus the developer resources the old footer carried. Kept on every page for SEO.
const GUIDES = [
  ...LANDING_PAGES.filter((p) => p.live).map((p) => ({ label: p.title, href: p.path })),
  { label: 'Features', href: '/#features' },
  { label: 'MCP server', href: '/#mcp' },
  { label: 'REST API', href: `${DOCS}/docs/api-reference/rest-api` },
  { label: 'CLI', href: `${DOCS}/docs/getting-started/quickstart` },
  { label: 'Examples', href: `${GITHUB}/tree/master/examples` },
  { label: 'Migration guide', href: `${DOCS}/docs/guides/migration-from-uploadthing` },
]

function FootLink({ label, href }: { label: string; href: string }) {
  return href.startsWith('/') ? <Link href={href}>{label}</Link> : <a href={href}>{label}</a>
}

export function Footer() {
  return (
    <footer className="foot">
      <span>UploadKit is open source under the MIT license.</span>
      {FOOT.map((l) => <FootLink key={l.label} {...l} />)}
      <nav className="foot-nav" aria-label="Guides and comparisons">
        {GUIDES.map((l) => <FootLink key={l.label} {...l} />)}
      </nav>
    </footer>
  )
}
