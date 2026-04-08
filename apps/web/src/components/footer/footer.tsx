// Server Component — no "use client"

const CURRENT_YEAR = new Date().getFullYear()

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterColumn {
  heading: string
  links: FooterLink[]
}

const columns: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Dashboard', href: 'https://app.uploadkit.dev', external: true },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Documentation', href: 'https://docs.uploadkit.dev', external: true },
      { label: 'API Reference', href: 'https://docs.uploadkit.dev/api', external: true },
      { label: 'SDK Reference', href: 'https://docs.uploadkit.dev/sdk', external: true },
      { label: 'GitHub', href: 'https://github.com/uploadkit/uploadkit', external: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Twitter', href: 'https://twitter.com/uploadkit', external: true },
      { label: 'Discord', href: 'https://discord.gg/uploadkit', external: true },
      { label: 'Status', href: 'https://status.uploadkit.dev', external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand column */}
          <div className="footer-brand">
            <div className="footer-logo" aria-label="UploadKit">
              <span className="footer-logo-dot" aria-hidden="true" />
              UploadKit
            </div>
            <p className="footer-tagline">
              File uploads as a service.
              <br />
              Built for developers who ship.
            </p>
            <p className="footer-copyright">
              &copy; {CURRENT_YEAR} UploadKit. All rights reserved.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.heading} aria-label={`${col.heading} links`}>
              <h4 className="footer-col-heading">{col.heading}</h4>
              <ul className="footer-col-links">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="footer-link"
                      {...(link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p className="footer-bottom-text">Built with care for developers</p>
        </div>
      </div>
    </footer>
  )
}
