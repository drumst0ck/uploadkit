import type { Metadata } from 'next'
import Navbar from '@/components/nav/navbar'
import { Footer } from '@/components/footer/footer'

export const metadata: Metadata = {
  title: 'Changelog — UploadKit',
  description:
    'New features, improvements, and bug fixes shipped to UploadKit. Follow our progress.',
  openGraph: {
    title: 'UploadKit Changelog',
    description: 'New features, improvements, and bug fixes shipped to UploadKit.',
    url: 'https://uploadkit.dev/changelog',
    type: 'website',
  },
}

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="changelog-hero">
          <div className="container">
            <h1 className="changelog-title">Changelog</h1>
            <p className="changelog-subtitle">What&rsquo;s new in UploadKit</p>
          </div>
        </section>

        {/* Entries */}
        <section className="changelog-entries">
          <div className="container">
            <article className="changelog-entry">
              <div className="changelog-entry-meta">
                <time className="changelog-date" dateTime="2026-04-10">
                  April 10, 2026
                </time>
                <span className="changelog-version">v0.2.1</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">
                  Polish pass, storage reclaim &amp; MIT license
                </h2>
                <p className="changelog-entry-lead">
                  A big quality-of-life release touching the landing, dashboard,
                  publishing pipeline and cleanup infrastructure.
                </p>
                <ul className="changelog-entry-list">
                  <li>
                    SDK packages (<code>@uploadkitdev/core</code>,{' '}
                    <code>@uploadkitdev/react</code>, <code>@uploadkitdev/next</code>)
                    are now published under the <strong>MIT license</strong> with
                    author, repository, homepage and keywords metadata — the npm
                    landing page finally renders correctly
                  </li>
                  <li>
                    Landing page polish: animated <code>DarkVeil</code> WebGL hero
                    background, staggered <code>BlurText</code> headline,{' '}
                    <code>SpotlightCard</code> cursor glow on feature cards, and a
                    new install command with package-manager tabs and copy-to-
                    clipboard feedback
                  </li>
                  <li>
                    New <code>AnimatedButton</code> component powering every CTA on
                    the site — sheen sweep on hover, cursor-tracking radial, icon
                    translate on focus
                  </li>
                  <li>
                    Dashboard gets the same treatment: metric cards now spring-
                    animate to their values (<code>CountUp</code>) and glow on
                    hover, project cards fade in with a cascading stagger, the{' '}
                    <code>/login</code> page ships a dark animated background
                  </li>
                  <li>
                    Bulk file delete in the dashboard now actually removes objects
                    from R2 and decrements your usage counter — previously it only
                    soft-marked the rows, leaving orphaned bytes in storage
                  </li>
                  <li>
                    Account deletion now cleans the Auth.js <code>accounts</code>{' '}
                    and <code>sessions</code> collections too — you can delete your
                    account and log back in with the same provider without hitting
                    a duplicate-key error
                  </li>
                  <li>
                    New daily cron that reclaims storage from abandoned free-tier
                    accounts: warning email at day 23 and file cleanup at day 30.
                    Paid subscriptions are fully exempt as long as they&rsquo;re
                    active
                  </li>
                  <li>
                    Mobile fixes: the install command pill no longer overflows the
                    viewport, the code window shrinks to fit small screens, and the
                    navbar hamburger menu closes when you tap a link, on ESC, and
                    anywhere you&rsquo;d expect
                  </li>
                  <li>
                    Real sitemaps for both <code>uploadkit.dev</code> and{' '}
                    <code>docs.uploadkit.dev</code> — every MDX docs page is now
                    enumerated for Search Console
                  </li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-entry-meta">
                <time className="changelog-date" dateTime="2026-04-09">
                  April 9, 2026
                </time>
                <span className="changelog-version">v0.1.0</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">Initial Launch</h2>
                <p className="changelog-entry-lead">
                  UploadKit is live. Here&rsquo;s what shipped in the initial release:
                </p>
                <ul className="changelog-entry-list">
                  <li>
                    Managed file storage powered by Cloudflare R2 with global CDN and zero egress
                    fees
                  </li>
                  <li>
                    <code>@uploadkitdev/react</code> — <code>UploadButton</code>,{' '}
                    <code>UploadDropzone</code>, and <code>UploadModal</code> components with CSS
                    custom property theming
                  </li>
                  <li>
                    <code>@uploadkitdev/next</code> — Next.js App Router handler,{' '}
                    <code>NextSSRPlugin</code>, and <code>withUk</code> Tailwind wrapper
                  </li>
                  <li>
                    Backend adapters for Express, Fastify, and Hono — same FileRouter, different
                    runtime
                  </li>
                  <li>
                    BYOS (Bring Your Own Storage) — use your own S3/R2 bucket with zero frontend
                    changes
                  </li>
                  <li>
                    Dashboard with project management, file browser, API key management, upload
                    logs, and usage metrics
                  </li>
                  <li>Free tier: 5 GB storage, 10 GB bandwidth, 1,000 uploads/month</li>
                  <li>
                    <code>config.mode</code>, <code>onBeforeUploadBegin</code>,{' '}
                    <code>uploadProgressGranularity</code>, and <code>data-uk-element</code> theming
                    attributes
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
