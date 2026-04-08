// Server Component — no "use client"

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    title: 'Managed storage',
    description: 'Cloudflare R2 with global CDN. Zero egress fees. Your files, always fast.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22V12" /><path d="m15 15-3-3-3 3" />
        <path d="M8 6H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1" />
        <rect x="8" y="2" width="8" height="6" rx="1" />
      </svg>
    ),
    title: 'Bring Your Own Storage',
    description: 'Works with your S3/R2 bucket. SDK interface is identical. No vendor lock-in.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.47-1.125-.29-.29-.438-.652-.438-1.013 0-.906.75-1.625 1.658-1.625H16c2.484 0 4.5-2.016 4.5-4.5 0-4.965-4.5-9-9-9z" />
      </svg>
    ),
    title: 'Beautiful components',
    description: 'Drop-in React components. Dark mode native. CSS variables for complete theming control.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Type-safe',
    description: 'End-to-end TypeScript. File router pattern. Descriptive error messages. Zero any.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Direct uploads',
    description: 'Presigned URLs — files go straight to storage. No server bottleneck. Multipart for large files.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Dashboard',
    description: 'Monitor uploads, usage, and billing in real-time. File browser, API keys, and more.',
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="section-header" data-animate>
          <p className="section-label">Why UploadKit</p>
          <h2 className="section-title">Everything you need for file uploads</h2>
          <p className="section-subtitle">
            One SDK that handles the entire upload lifecycle — from the browser to storage to your dashboard.
          </p>
        </div>

        <div className="features-grid stagger-grid" data-animate>
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className="feature-card"
              style={{ '--index': i } as React.CSSProperties}
            >
              <div className="feature-icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
