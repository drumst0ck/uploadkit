import Link from 'next/link'

export interface RelatedLink {
  label: string
  href: string
  description?: string
}

/** Internal links list. External (http) hrefs render as plain anchors. */
export function RelatedLinks({
  links,
  title = 'Related',
}: {
  links: RelatedLink[]
  title?: string
}) {
  return (
    <nav className="col related" aria-label={title}>
      <h2>{title}</h2>
      <ul role="list">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith('http') ? (
              <a href={l.href}>{l.label}</a>
            ) : (
              <Link href={l.href}>{l.label}</Link>
            )}
            {l.description && <span className="soft"> — {l.description}</span>}
          </li>
        ))}
      </ul>
    </nav>
  )
}
