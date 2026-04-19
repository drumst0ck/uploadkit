// Server Component — redesigned 5-column footer (Claude Design).
// Scoped via data-surface-footer="design-v2" so it does not collide with legacy
// .footer / .footer-grid rules used by other routes.

import Link from 'next/link'
import { DesignIcon } from '@/components/ui/design-icon'

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterColumn {
  heading: string
  links: FooterLink[]
}

const COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Components', href: '/#components' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Dashboard', href: 'https://app.uploadkit.dev', external: true },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Documentation', href: 'https://docs.uploadkit.dev', external: true },
      {
        label: 'REST API',
        href: 'https://docs.uploadkit.dev/docs/api-reference/rest-api',
        external: true,
      },
      { label: 'MCP server', href: '/#mcp' },
      {
        label: 'CLI',
        href: 'https://docs.uploadkit.dev/docs/getting-started/quickstart',
        external: true,
      },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      {
        label: 'Examples',
        href: 'https://github.com/drumst0ck/uploadkit/tree/master/examples',
        external: true,
      },
      {
        label: 'Migration guide',
        href: 'https://docs.uploadkit.dev/docs/guides/migration-from-uploadthing',
        external: true,
      },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Contact', href: 'mailto:support@uploadkit.dev' },
      {
        label: 'GitHub',
        href: 'https://github.com/drumst0ck/uploadkit',
        external: true,
      },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer data-surface-footer="design-v2" aria-label="Site footer">
      <div className="footer-grid">
        <div className="footer-col">
          <Link href="/" className="brand" aria-label="UploadKit home">
            <span className="brand-mark">
              <DesignIcon name="upload" size={12} />
            </span>
            uploadkit
          </Link>
          <p className="footer-blurb">
            File uploads for developers. Open-source SDK, premium components, managed storage,
            BYOS. MIT.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div className="footer-col" key={col.heading}>
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={`${col.heading}-${link.label}`}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <span>© {year} UploadKit · MIT license</span>
        <span className="status">
          <span className="status-dot" aria-hidden="true" />
          All systems operational
        </span>
      </div>
    </footer>
  )
}
