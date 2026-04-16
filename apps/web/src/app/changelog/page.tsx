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
                <time className="changelog-date" dateTime="2026-04-16">
                  April 16, 2026
                </time>
                <span className="changelog-version">v1.2.0</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">
                  UploadBeam &amp; uploadkit CLI
                </h2>

                <h3 className="changelog-entry-subtitle">UploadBeam</h3>
                <p className="changelog-entry-lead">
                  Apple Intelligence-style animated border beam for upload
                  components. New <code>&lt;UploadBeam&gt;</code> wrapper,{' '}
                  <code>beam</code> prop on all dropzones and buttons, and a
                  standalone <code>&lt;UploadButtonBeam&gt;</code> variant.
                </p>

                <h3 className="changelog-entry-subtitle">
                  <code>uploadkit</code> CLI
                </h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>npx uploadkit init</code> — detects your framework and
                    wires UploadKit in under 60 seconds
                  </li>
                  <li>
                    <code>npx uploadkit add &lt;component&gt;</code> — inserts
                    components shadcn-style
                  </li>
                  <li>
                    <code>npx uploadkit restore</code> — rolls back changes
                    safely
                  </li>
                  <li>
                    Supports Next.js (<code>app/</code> and{' '}
                    <code>src/app/</code>), SvelteKit, Remix, and Vite+React
                  </li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-entry-meta">
                <time className="changelog-date" dateTime="2026-04-15">
                  April 15, 2026
                </time>
                <span className="changelog-version">v1.1.0</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">
                  create-uploadkit-app, blog &amp; docs refresh
                </h2>

                <h3 className="changelog-entry-subtitle">
                  <code>create-uploadkit-app</code> CLI
                </h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>npx create-uploadkit-app my-app</code> — scaffolds a
                    new project with 4 templates: Next.js 16, SvelteKit, React
                    Router v7, Vite+React
                  </li>
                  <li>
                    Interactive prompts, auto package manager detection
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Blog</h3>
                <ul className="changelog-entry-list">
                  <li>
                    16 SEO-optimized posts covering uploads, R2, security, MCP,
                    and framework tutorials
                  </li>
                  <li>
                    MDX + Shiki syntax highlighting, RSS feed, dynamic OG images,
                    JSON-LD structured data
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Documentation updates</h3>
                <ul className="changelog-entry-list">
                  <li>
                    New quickstart leading with existing-project install
                  </li>
                  <li>
                    CLI guides for both <code>uploadkit</code> and{' '}
                    <code>create-uploadkit-app</code>
                  </li>
                  <li>
                    UploadBeam + UploadButtonBeam component docs
                  </li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-entry-meta">
                <time className="changelog-date" dateTime="2026-04-14">
                  April 14, 2026
                </time>
                <span className="changelog-version">v1.0.0</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">
                  Official MCP server — stdio + remote HTTP
                </h2>
                <p className="changelog-entry-lead">
                  UploadKit is now AI-native. Claude Code, Cursor, Windsurf,
                  Zed, ChatGPT, and Claude.ai can generate UploadKit code with
                  first-class knowledge of every component, scaffold, and docs
                  page — no more hallucinated props or outdated snippets.
                </p>

                <h3 className="changelog-entry-subtitle">Two transports, one surface</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <strong>stdio</strong> — install in any MCP-aware IDE with{' '}
                    <code>npx -y @uploadkitdev/mcp</code>. Runs locally, zero
                    latency, works offline.
                  </li>
                  <li>
                    <strong>Remote Streamable HTTP</strong> —{' '}
                    <code>https://api.uploadkit.dev/api/v1/mcp</code>, stateless,
                    public read-only, CORS-open. Paste into ChatGPT custom
                    connectors or Claude.ai web.
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">11 tools, 88+ docs pages indexed</h3>
                <ul className="changelog-entry-list">
                  <li>
                    Component discovery — <code>list_components</code>,{' '}
                    <code>get_component</code>, <code>search_components</code>
                  </li>
                  <li>
                    Scaffolding — <code>scaffold_route_handler</code>,{' '}
                    <code>scaffold_provider</code>, <code>get_install_command</code>
                  </li>
                  <li>
                    BYOS setup — <code>get_byos_config</code> for S3, R2, GCS,
                    Backblaze B2
                  </li>
                  <li>
                    Full docs search — <code>search_docs</code>,{' '}
                    <code>get_doc</code>, <code>list_docs</code> (88+ pages
                    indexed at build time)
                  </li>
                  <li>
                    Onboarding — <code>get_quickstart</code> end-to-end Next.js
                    setup
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Published everywhere</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <a href="https://www.npmjs.com/package/@uploadkitdev/mcp">
                      npm
                    </a>{' '}
                    — <code>@uploadkitdev/mcp</code>
                  </li>
                  <li>
                    <a href="https://registry.modelcontextprotocol.io">
                      Official MCP Registry
                    </a>{' '}
                    — <code>io.github.drumst0ck/uploadkit</code>
                  </li>
                  <li>
                    <a href="https://glama.ai/mcp/servers/drumst0ck/uploadkit">
                      Glama
                    </a>{' '}
                    — AAA score (security, license, quality)
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Full guide</h3>
                <p>
                  See{' '}
                  <a href="https://docs.uploadkit.dev/docs/guides/mcp">
                    docs.uploadkit.dev/docs/guides/mcp
                  </a>{' '}
                  for setup instructions for every editor, curl smoke tests,
                  Docker self-host, and the full tool reference.
                </p>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-entry-meta">
                <time className="changelog-date" dateTime="2026-04-13">
                  April 13, 2026
                </time>
                <span className="changelog-version">v0.3.0</span>
              </div>

              <div className="changelog-entry-body">
                <h2 className="changelog-entry-title">
                  40+ upload components, landing showcase &amp; full docs
                </h2>
                <p className="changelog-entry-lead">
                  The biggest component drop in UploadKit history. 36 new
                  premium components across 7 categories — every one with
                  Motion animations, CSS fallbacks, dark mode, a11y, and a
                  live interactive doc page.
                </p>

                <h3 className="changelog-entry-subtitle">Premium Dropzones (6 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadDropzoneGlass</code> — Vercel/Linear frosted glass
                    with indigo glow halo
                  </li>
                  <li>
                    <code>UploadDropzoneAurora</code> — Apple/Supabase animated
                    conic-gradient mesh
                  </li>
                  <li>
                    <code>UploadDropzoneTerminal</code> — Raycast/Warp monospace
                    prompt with tail log
                  </li>
                  <li>
                    <code>UploadDropzoneBrutal</code> — Neobrutalist thick borders
                    with stamp animation
                  </li>
                  <li>
                    <code>UploadDropzoneMinimal</code> — Stripe/Resend ultra-clean
                    with subtle border pulse
                  </li>
                  <li>
                    <code>UploadDropzoneNeon</code> — Cyberpunk neon glow traces,
                    scanline overlay, monospace
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Premium Buttons (4 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadButtonShimmer</code> — Shimmer sweep gradient CTA
                  </li>
                  <li>
                    <code>UploadButtonMagnetic</code> — Apple-style cursor-attracted
                    spring
                  </li>
                  <li>
                    <code>UploadButtonPulse</code> — Calm radial ring pulse with
                    squeeze-on-click
                  </li>
                  <li>
                    <code>UploadButtonGradient</code> — Instagram/TikTok rotating
                    conic gradient ring
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Specialty Components (6 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadAvatar</code> — Circular crop with SVG progress ring
                  </li>
                  <li>
                    <code>UploadInlineChat</code> — ChatGPT/Linear composer with
                    animated chips
                  </li>
                  <li>
                    <code>UploadSourceTabs</code> — Cloudinary/Uppy multi-source:
                    Device, URL, Clipboard tabs
                  </li>
                  <li>
                    <code>UploadScannerFrame</code> — Stripe Identity viewfinder
                    with corner brackets and sweep line
                  </li>
                  <li>
                    <code>UploadBookFlip</code> — Issuu/Apple Books 3D book with
                    page-flip progress
                  </li>
                  <li>
                    <code>UploadVinyl</code> — Spotify/Bandcamp vinyl record with
                    spinning grooves
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Themed Dropzones (4 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadEnvelope</code> — WeTransfer 3D envelope with SVG
                    flap animation and wax seal
                  </li>
                  <li>
                    <code>UploadBlueprint</code> — CAD/technical schematic with grid
                    lines, crosshairs, and block-char progress
                  </li>
                  <li>
                    <code>UploadDataStream</code> — Matrix-style character rain that
                    accelerates during upload
                  </li>
                  <li>
                    <code>UploadStickyBoard</code> — Miro/FigJam corkboard with
                    colored sticky notes
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Motion &amp; Progress (10 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadProgressRadial</code> — Activity-ring with pathLength
                    fill and splash
                  </li>
                  <li>
                    <code>UploadProgressBar</code> — Horizontal bar with shimmer sweep
                  </li>
                  <li>
                    <code>UploadProgressWave</code> — Spotify waveform bars filling
                    left-to-right
                  </li>
                  <li>
                    <code>UploadProgressLiquid</code> — Apple-style dual sine-wave
                    liquid fill
                  </li>
                  <li>
                    <code>UploadProgressStacked</code> — iOS AirDrop vertical stack
                  </li>
                  <li>
                    <code>UploadProgressOrbit</code> — Orbiting file icons that land
                    on complete
                  </li>
                  <li>
                    <code>UploadCloudRain</code> — Cloud SVG fills as files upload
                  </li>
                  <li>
                    <code>UploadBento</code> — Bento grid with layoutId reorder
                  </li>
                  <li>
                    <code>UploadParticles</code> — Particle constellation converging
                    to center
                  </li>
                  <li>
                    <code>UploadStepWizard</code> — 5-step select → preview → confirm
                    → upload → done
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Multi-file Visualizers (6 new)</h3>
                <ul className="changelog-entry-list">
                  <li>
                    <code>UploadGalleryGrid</code> — Pinterest image gallery with
                    per-cell progress rings
                  </li>
                  <li>
                    <code>UploadTimeline</code> — GitHub/Linear vertical timeline
                    with status nodes
                  </li>
                  <li>
                    <code>UploadPolaroid</code> — Photo stack with polaroid developing
                    effect
                  </li>
                  <li>
                    <code>UploadKanban</code> — Trello-style pipeline columns with
                    layoutId transitions
                  </li>
                  <li>
                    <code>UploadAttachmentTray</code> — Discord/iMessage horizontal
                    scrollable strip
                  </li>
                  <li>
                    <code>UploadNotificationPanel</code> — Google Drive-style inline
                    upload manager card
                  </li>
                </ul>

                <h3 className="changelog-entry-subtitle">Infrastructure</h3>
                <ul className="changelog-entry-list">
                  <li>
                    New landing page <strong>Component Showcase</strong> section
                    between Features and Pricing — 16 curated components with
                    horizontal pill selector, live preview stage, and &ldquo;Simulate
                    upload&rdquo; button
                  </li>
                  <li>
                    All 36 new components have dedicated MDX documentation pages with{' '}
                    <code>&lt;ComponentPreview&gt;</code> wrappers, props tables,
                    theming guides, and a11y notes
                  </li>
                  <li>
                    <code>UploadKitProvider</code> now accepts an optional{' '}
                    <code>client</code> prop for dependency injection — used by docs
                    previews and tests with a mock client
                  </li>
                  <li>
                    <code>motion</code> is an optional peerDependency across all
                    premium components — CSS keyframe fallbacks render when Motion is
                    not installed. <code>prefers-reduced-motion</code> respected
                    throughout
                  </li>
                  <li>
                    Docs navigation reorganized into 7 sections: Classics, Premium
                    Dropzones, Premium Buttons, Specialty, Themed Dropzones, Motion
                    &amp; Progress, Multi-file Visualizers
                  </li>
                  <li>
                    <code>mergeClass()</code> utility upgraded to variadic args
                  </li>
                </ul>
              </div>
            </article>

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
