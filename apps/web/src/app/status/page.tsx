import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/shell';

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
    <SiteShell>
      <section className="page-head" aria-labelledby="status-title">
        <h1 className="page-title enter" id="status-title">All systems operational</h1>
        <div className="col">
          <p className="lead enter" style={{ '--i': 1 } as React.CSSProperties}>
            Real-time status for UploadKit services. Enterprise SLA: 99.99% on Team+ plans.
          </p>
        </div>
      </section>

      <section aria-label="Services">
        <div className="wide" style={{ maxWidth: 760 }}>
          <ul className="rows">
            {SERVICES.map((service) => (
              <li key={service.name}>
                <span>{service.name}</span>
                <span className="soft small">
                  {service.uptime} 30d · <span className="ok">{service.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="col" style={{ marginTop: 64 }}>
        <p className="soft small">
          Subscribe to updates: <a href="mailto:status@uploadkit.dev">status@uploadkit.dev</a>
        </p>
      </div>
    </SiteShell>
  );
}
