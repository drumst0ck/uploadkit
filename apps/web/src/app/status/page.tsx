import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/shell';
import {
  checkPlatform,
  overallState,
  type ComponentState,
} from '@/lib/status';

export const metadata: Metadata = {
  title: 'Status — UploadKit',
  description: 'Live UploadKit platform status: API, database, dashboard and CDN.',
};

// Checks run server-side and the page is regenerated at most once per minute.
export const revalidate = 60; // must be a literal; keep equal to REVALIDATE_SECONDS

const HEADLINE: Record<ComponentState, string> = {
  operational: 'All systems operational',
  outage: 'Some systems are having problems',
  unknown: 'Status partially unavailable',
};

const LABEL: Record<ComponentState, string> = {
  operational: 'operational',
  outage: 'outage',
  unknown: 'unknown',
};

export default async function StatusPage() {
  const { components, checkedAt } = await checkPlatform();
  const overall = overallState(components);

  return (
    <SiteShell>
      <section className="page-head" aria-labelledby="status-title">
        <h1 className="page-title enter" id="status-title">{HEADLINE[overall]}</h1>
        <div className="col">
          <p className="lead enter" style={{ '--i': 1 } as React.CSSProperties}>
            Results of live checks, refreshed about every minute. Last checked{' '}
            <time dateTime={checkedAt}>{new Date(checkedAt).toUTCString()}</time>.
          </p>
        </div>
      </section>

      <section aria-label="Services">
        <div className="wide" style={{ maxWidth: 760 }}>
          <ul className="rows">
            {components.map((component) => (
              <li key={component.id}>
                <span>{component.name}</span>
                <span className="soft small">
                  <span className={component.state === 'operational' ? 'ok' : undefined}>
                    {LABEL[component.state]}
                  </span>
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
