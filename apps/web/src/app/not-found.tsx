import Link from 'next/link'
import { SiteShell } from '@/components/site/shell'

export default function NotFound() {
  return (
    <SiteShell>
      <section className="page-head" aria-labelledby="nf-title">
        <h1 className="page-title enter" id="nf-title">Page not found</h1>
        <div className="col">
          <p className="lead enter" style={{ '--i': 1 } as React.CSSProperties}>
            That address does not exist or has moved.
          </p>
          <p className="enter" style={{ '--i': 2 } as React.CSSProperties}>
            <Link className="go" href="/">Back to the home page</Link>
          </p>
          <p className="soft small enter" style={{ '--i': 3 } as React.CSSProperties}>
            Or try <Link href="/pricing">pricing</Link>, <Link href="/components">components</Link> or the{' '}
            <Link href="/blog">blog</Link>.
          </p>
        </div>
      </section>
    </SiteShell>
  )
}
