// Server Component — no "use client"
import { OVERAGE_PRICING } from '@/lib/tier-data'

const StorageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
)

const BandwidthIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

export function OverageSection() {
  return (
    <section className="overage-section">
      <div className="container">
        <div className="section-header">
          <p className="section-label">Transparent pricing</p>
          <h2 className="section-title">Pay only for what you use</h2>
          <p className="section-subtitle">
            Generous limits on every plan. Overages are billed at the end of each
            billing cycle — no surprises.
          </p>
        </div>

        <div className="overage-grid">
          {/* Storage */}
          <div className="overage-card">
            <div className="overage-icon">
              <StorageIcon />
            </div>
            <div className="overage-price">
              ${OVERAGE_PRICING.storagePerGb.toFixed(2)}
              <span className="overage-unit">/GB/mo</span>
            </div>
            <p className="overage-label">Storage</p>
            <p className="overage-desc">
              Additional storage beyond your plan&apos;s limit, billed monthly.
            </p>
          </div>

          {/* Bandwidth */}
          <div className="overage-card">
            <div className="overage-icon">
              <BandwidthIcon />
            </div>
            <div className="overage-price">
              ${OVERAGE_PRICING.bandwidthPerGb.toFixed(2)}
              <span className="overage-unit">/GB</span>
            </div>
            <p className="overage-label">Bandwidth</p>
            <p className="overage-desc">
              Zero egress fees thanks to Cloudflare R2. Only pay for bandwidth
              beyond your monthly limit.
            </p>
          </div>

          {/* Uploads */}
          <div className="overage-card">
            <div className="overage-icon">
              <UploadIcon />
            </div>
            <div className="overage-price">
              ${OVERAGE_PRICING.uploadsPerUnit.toFixed(3)}
              <span className="overage-unit">/upload</span>
            </div>
            <p className="overage-label">Uploads</p>
            <p className="overage-desc">
              Additional uploads beyond your monthly limit. We notify you at 80%
              usage.
            </p>
          </div>
        </div>

        <p className="overage-footer-note">
          All paid plans include generous limits. Overages only apply when you exceed
          them. We&apos;ll always send a notification before any overage charges.
        </p>
      </div>
    </section>
  )
}
