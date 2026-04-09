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
