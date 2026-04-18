'use client'

// BYOS section — provider cards + tabbed code snippet (R2 / S3 / GCS).
// Tabs need local state; client component. Snippets are plain preformatted — no syntax
// tokens to keep the component tree small; the visual result is faithful to the design.

import { useState } from 'react'

type BYOSTab = 'r2' | 's3' | 'gcs'

interface Provider {
  name: string
  desc: string
  mark: string
  color: string
}

const PROVIDERS: Provider[] = [
  { name: 'Cloudflare R2', desc: '$0 egress', mark: 'R2', color: '#f97316' },
  { name: 'AWS S3', desc: 'classic', mark: 'S3', color: '#eab308' },
  { name: 'Google Cloud', desc: 'GCS', mark: 'G', color: '#3b82f6' },
  { name: 'Backblaze B2', desc: 'cheap', mark: 'B2', color: '#ef4444' },
]

const SNIPPETS: Record<BYOSTab, string> = {
  r2: `import { createUploadKitHandler } from '@uploadkitdev/next';
import { createR2Storage } from '@uploadkitdev/next/byos';

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createR2Storage({
    accountId:       process.env.R2_ACCOUNT_ID!,
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET!,
    bucket:          process.env.R2_BUCKET!,
  }),
});`,
  s3: `import { createUploadKitHandler } from '@uploadkitdev/next';
import { createS3Storage } from '@uploadkitdev/next/byos';

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createS3Storage({
    region:          'us-east-1',
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET!,
    bucket:          process.env.AWS_BUCKET!,
  }),
});`,
  gcs: `import { createUploadKitHandler } from '@uploadkitdev/next';
import { createGCSStorage } from '@uploadkitdev/next/byos';

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createGCSStorage({
    projectId:   process.env.GCP_PROJECT!,
    keyFilename: process.env.GCP_KEY_PATH!,
    bucket:      process.env.GCS_BUCKET!,
  }),
});`,
}

const TAB_LABELS: Record<BYOSTab, string> = {
  r2: 'app/api/uploadkit/route.ts · R2',
  s3: '· S3',
  gcs: '· GCS',
}

export function ByosSection() {
  const [tab, setTab] = useState<BYOSTab>('r2')

  return (
    <section id="byos" aria-labelledby="byos-headline">
      <div className="d2-container">
        <div className="byos-grid">
          <div>
            <span className="eyebrow">BYOS · bring your own storage</span>
            <h2 id="byos-headline" style={{ marginTop: 16 }}>
              Your bucket. Our SDK. <br />
              Zero vendor lock-in.
            </h2>
            <p className="lead" style={{ marginTop: 16 }}>
              Use the same components and hooks against your own bucket. Credentials stay
              server-side. Switch providers by changing six lines of code.
            </p>

            <div className="providers">
              {PROVIDERS.map((p) => (
                <div className="provider" key={p.name}>
                  <div
                    className="provider-mark"
                    style={{
                      background: `color-mix(in oklab, ${p.color} 20%, var(--bg-card-2))`,
                      color: p.color,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${p.color} 30%, transparent)`,
                    }}
                  >
                    {p.mark}
                  </div>
                  <div>
                    <div className="provider-name">{p.name}</div>
                    <div className="provider-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="code-block">
            <div className="code-tabs" role="tablist" aria-label="BYOS snippets">
              {(Object.keys(SNIPPETS) as BYOSTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === tab}
                  className={'code-tab' + (t === tab ? ' active' : '')}
                  onClick={() => setTab(t)}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="code-body" role="tabpanel">
              <pre>{SNIPPETS[tab]}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
