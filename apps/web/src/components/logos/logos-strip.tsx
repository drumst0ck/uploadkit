// Server Component — "open source" strip between hero and features.
// Only verifiable facts: every item links to the public repo or a published npm package.
// No customer logos and no usage numbers until there are real ones to show.

const LINKS = [
  { label: 'github.com/drumst0ck/uploadkit', href: 'https://github.com/drumst0ck/uploadkit' },
  { label: '@uploadkitdev/react', href: 'https://www.npmjs.com/package/@uploadkitdev/react' },
  { label: '@uploadkitdev/next', href: 'https://www.npmjs.com/package/@uploadkitdev/next' },
  { label: '@uploadkitdev/core', href: 'https://www.npmjs.com/package/@uploadkitdev/core' },
  { label: '@uploadkitdev/mcp', href: 'https://www.npmjs.com/package/@uploadkitdev/mcp' },
] as const

export function LogosStrip() {
  return (
    <div className="logos" aria-label="Open source packages">
      <div className="d2-container">
        <div className="logos-label">MIT licensed · open source on GitHub and npm</div>
        <div className="logos-row">
          {LINKS.map((link) => (
            <div key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
