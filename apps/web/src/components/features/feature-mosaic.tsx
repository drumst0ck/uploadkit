// Server Component — component catalog mosaic with mini previews.
// Sits above LandingShowcase (which renders the real interactive SDK components).

import { DesignIcon } from '@/components/ui/design-icon'

type MosaicKind = 'button' | 'dropzone' | 'radial' | 'avatar' | 'gallery' | 'bars'

interface MosaicItem {
  name: string
  desc: string
  span: 4 | 6 | 8
  kind: MosaicKind
}

const MOSAIC: MosaicItem[] = [
  { name: 'UploadButton', desc: 'The classic. One line, opinionated defaults.', span: 4, kind: 'button' },
  { name: 'UploadDropzone', desc: 'Drag, drop, done. Themeable via CSS custom properties.', span: 4, kind: 'dropzone' },
  { name: 'UploadProgressRadial', desc: 'Circular progress with live percentage readout.', span: 4, kind: 'radial' },
  { name: 'UploadAvatar', desc: 'Crop, preview, and replace. Optimized for profile photos.', span: 4, kind: 'avatar' },
  { name: 'UploadGalleryGrid', desc: 'Masonry grid with lazy loading and reordering.', span: 4, kind: 'gallery' },
  { name: 'UploadProgressStacked', desc: 'Multi-file progress with per-file speed and ETA.', span: 4, kind: 'bars' },
]

export function FeatureMosaic() {
  return (
    <section id="components" aria-labelledby="mosaic-headline">
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">40+ components</span>
          <h2 id="mosaic-headline" style={{ marginTop: 16 }}>
            Pick a dropzone. Ship an hour later.
          </h2>
          <p className="lead">
            From quiet defaults to loud opinions — each component is MIT-licensed, dark-mode out of
            the box, and works with or without motion as a peer.
          </p>
        </div>

        <div className="mosaic-grid">
          {MOSAIC.map((m, i) => (
            <div key={m.name} className={`mosaic-cell span-${m.span}`}>
              <div className="label">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span>@uploadkitdev/react</span>
              </div>
              <div className="name">{m.name}</div>
              <div className="desc">{m.desc}</div>
              <div className="preview">
                <MiniPreview kind={m.kind} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href="/#components-all" className="btn btn-ghost btn-lg">
            Browse all 40+ components <DesignIcon name="arrow" size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}

function MiniPreview({ kind }: { kind: MosaicKind }) {
  if (kind === 'button') {
    return (
      <span className="mini-btn">
        <DesignIcon name="upload" size={14} /> Upload file
      </span>
    )
  }
  if (kind === 'dropzone') {
    return <div className="mini-dz">drop files here</div>
  }
  if (kind === 'radial') {
    return <div className="mini-radial" />
  }
  if (kind === 'avatar') {
    return (
      <div className="mini-avatar">
        <DesignIcon name="image" size={18} />
      </div>
    )
  }
  if (kind === 'gallery') {
    return (
      <div className="mini-gallery">
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
    )
  }
  // bars
  return (
    <div className="mini-progress-bars">
      <div>
        <span style={{ width: '88%' }} />
      </div>
      <div>
        <span style={{ width: '62%' }} />
      </div>
      <div>
        <span style={{ width: '34%' }} />
      </div>
      <div>
        <span style={{ width: '100%' }} />
      </div>
    </div>
  )
}
