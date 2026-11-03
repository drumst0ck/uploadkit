// Real platform checks for the /status page. Server-side only, short timeouts,
// results cached by Next's fetch cache (see REVALIDATE_SECONDS). Only coarse
// states are returned: no URLs with credentials, headers or error text.

export type ComponentState = 'operational' | 'outage' | 'unknown';

export type ComponentStatus = {
  id: 'api' | 'database' | 'dashboard' | 'cdn';
  name: string;
  state: ComponentState;
};

export type PlatformStatus = {
  components: ComponentStatus[];
  checkedAt: string;
};

export const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 4000;

const API_HEALTH_URL = 'https://api.uploadkit.dev/api/health';
const DASHBOARD_URL = 'https://app.uploadkit.dev/';
const CDN_URL = 'https://cdn.uploadkit.dev/';

async function probe(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return null;
  }
}

// Reachable = the host answered with anything below 5xx (redirects to login and
// a worker 404 on the bare root both prove the service is serving).
function reachable(res: Response | null): ComponentState {
  if (!res) return 'outage';
  return res.status < 500 ? 'operational' : 'outage';
}

export async function checkPlatform(): Promise<PlatformStatus> {
  const [health, dashboard, cdn] = await Promise.all([
    probe(API_HEALTH_URL),
    probe(DASHBOARD_URL),
    probe(CDN_URL),
  ]);

  let database: ComponentState = 'unknown';
  let api: ComponentState = health ? 'operational' : 'outage';
  // Before the health route ships the API answers 404: it is serving, DB unknown.
  if (health && health.status !== 404) {
    try {
      const body = (await health.json()) as { checks?: { database?: string } };
      if (body.checks?.database === 'up') database = 'operational';
      else if (body.checks?.database === 'down') database = 'outage';
    } catch {
      // Not our JSON: the endpoint answered but is not a healthy API.
      api = 'outage';
    }
    if (health.status >= 500 && database !== 'outage') api = 'outage';
  }

  return {
    components: [
      { id: 'api', name: 'API (api.uploadkit.dev)', state: api },
      { id: 'database', name: 'Database', state: database },
      { id: 'dashboard', name: 'Dashboard (app.uploadkit.dev)', state: reachable(dashboard) },
      { id: 'cdn', name: 'CDN (cdn.uploadkit.dev)', state: reachable(cdn) },
    ],
    checkedAt: new Date().toISOString(),
  };
}

export function overallState(components: ComponentStatus[]): ComponentState {
  if (components.some((c) => c.state === 'outage')) return 'outage';
  if (components.some((c) => c.state === 'unknown')) return 'unknown';
  return 'operational';
}
