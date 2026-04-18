// Server Component — 6-feature grid with 1px hairline dividers (Claude Design shell).
// Scoped under [data-surface="design-v2"] so it does not collide with the legacy
// .features-grid / .feature-card rules on /pricing.

import { DesignIcon, type IconName } from '@/components/ui/design-icon'

interface FeatureItem {
  icon: IconName
  title: string
  desc: string
  tag: string
}

const FEATURES: FeatureItem[] = [
  {
    icon: 'zap',
    title: 'Presigned uploads',
    desc: 'Files go directly from the browser to storage. No proxy hop, no memory ceilings.',
    tag: 'direct-to-bucket',
  },
  {
    icon: 'layers',
    title: 'Multipart + resumable',
    desc: 'Ship 5 GB video uploads with chunked transfer and pause/resume out of the box.',
    tag: 'up to 5 TB per file',
  },
  {
    icon: 'shield',
    title: 'Type-safe file routes',
    desc: 'Define allowed MIME types, size caps, and metadata once — get end-to-end types.',
    tag: 'FileRouter API',
  },
  {
    icon: 'globe',
    title: 'Bring your own storage',
    desc: 'Same SDK, your bucket. AWS S3, Cloudflare R2, GCS, Backblaze B2. Credentials server-side.',
    tag: 'BYOS mode',
  },
  {
    icon: 'sparkle',
    title: 'MCP-native',
    desc: 'Install an MCP server and let Claude Code, Cursor, and Windsurf wire the whole thing up.',
    tag: '@uploadkitdev/mcp',
  },
  {
    icon: 'palette',
    title: '40+ premium components',
    desc: 'Glass, terminal, brutal, neon, aurora — themeable via CSS custom properties, dark mode default.',
    tag: '@uploadkitdev/react',
  },
]

export function DesignFeatures() {
  return (
    <section id="features" aria-labelledby="design-features-headline">
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">Batteries included</span>
          <h2 id="design-features-headline" style={{ marginTop: 16 }}>
            Everything between <br />
            file picker and object storage.
          </h2>
          <p className="lead">
            Stop stitching together pre-signed URLs, progress state, retry logic, and IAM policies.
            UploadKit is the one import.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon">
                <DesignIcon name={f.icon} size={22} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="feature-tag">{'// ' + f.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
