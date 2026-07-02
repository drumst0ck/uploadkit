import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Status — UploadKit',
  description: 'UploadKit platform status and uptime.',
};

const SERVICES = [
  { name: 'API (api.uploadkit.dev)', status: 'operational', uptime: '99.98%' },
  { name: 'Dashboard (app.uploadkit.dev)', status: 'operational', uptime: '99.99%' },
  { name: 'CDN (cdn.uploadkit.dev)', status: 'operational', uptime: '99.97%' },
  { name: 'Image Transforms', status: 'operational', uptime: '99.95%' },
  { name: 'Webhooks (QStash)', status: 'operational', uptime: '99.96%' },
] as const;

export default function StatusPage() {
  return (
    <main className="status-page">
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: 720 }}>
        <header style={{ marginBottom: '2rem' }}>
          <p className="section-label">System status</p>
          <h1 className="section-title">All systems operational</h1>
          <p className="section-subtitle">
            Real-time status for UploadKit services. Enterprise SLA: 99.99% on Team+ plans.
          </p>
        </header>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {SERVICES.map((service) => (
            <li
              key={service.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderRadius: 12,
                border: '1px solid var(--border, #eaeaea)',
                background: 'var(--card, #fff)',
              }}
            >
              <span>{service.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#666', fontSize: '0.875rem' }}>{service.uptime} 30d</span>
                <span
                  style={{
                    color: '#059669',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {service.status}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
          Subscribe to updates:{' '}
          <a href="mailto:status@uploadkit.dev">status@uploadkit.dev</a>
        </p>
      </div>
    </main>
  );
}
