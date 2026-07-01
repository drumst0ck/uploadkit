import { DesignIcon } from '@/components/ui/design-icon'

const variants = [
  { label: 'AVIF', detail: '800w · q75', className: 'transform-variant-avif' },
  { label: 'WebP', detail: '640×360 · cover', className: 'transform-variant-webp' },
  { label: 'PNG', detail: '500×500 · contain', className: 'transform-variant-png' },
] as const

export function ImageTransformsSection() {
  return (
    <section id="image-transforms" aria-labelledby="image-transforms-headline">
      <div className="d2-container">
        <div className="transform-shell">
          <div className="transform-copy">
            <span className="eyebrow">Cloud image transforms</span>
            <h2 id="image-transforms-headline">One original. Every screen.</h2>
            <p className="lead">
              Resize, crop, optimize, and convert images at the edge. Signed URLs keep your
              originals private; Cloudflare caches each variant close to your users.
            </p>

            <div className="transform-code" aria-label="Image transformation SDK example">
              <span className="transform-code-comment">// server-side</span>
              <code>
                <span>await uploadkit.transformImage</span>
                <span className="transform-code-muted">(file.key, {'{'}</span>
                <span className="transform-code-indent">width: 800, fit: &apos;cover&apos;,</span>
                <span className="transform-code-indent">format: &apos;auto&apos;, quality: 75</span>
                <span className="transform-code-muted">{'}'})</span>
              </code>
            </div>

            <div className="transform-meta" role="list" aria-label="Transformation features">
              <span role="listitem"><DesignIcon name="check" size={12} /> AVIF · WebP · JPEG · PNG</span>
              <span role="listitem"><DesignIcon name="check" size={12} /> Global edge cache</span>
              <span role="listitem"><DesignIcon name="check" size={12} /> Paid Cloud plans</span>
            </div>

            <a
              href="https://docs.uploadkit.dev/docs/core-concepts/image-transformations"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-lg transform-cta"
            >
              Explore image transforms <DesignIcon name="arrow" size={14} />
            </a>
          </div>

          <div className="transform-stage" aria-label="Original image branching into optimized formats">
            <div className="transform-original">
              <span>ORIGINAL</span>
              <strong>2400×1600</strong>
              <small>JPEG · 1.8 MB</small>
            </div>
            <div className="transform-rail" aria-hidden="true"><i /><i /><i /></div>
            <div className="transform-variants">
              {variants.map((variant) => (
                <div key={variant.label} className={`transform-variant ${variant.className}`}>
                  <div className="transform-variant-image" />
                  <span>{variant.label}</span>
                  <small>{variant.detail}</small>
                </div>
              ))}
            </div>
            <div className="transform-edge-badge">
              <span className="transform-pulse" /> cached at the edge
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
