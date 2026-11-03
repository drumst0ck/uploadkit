import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkPlatform, overallState } from '@/lib/status';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(handler: (url: string) => Promise<Response> | Response) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => handler(String(input))));
}

describe('checkPlatform', () => {
  it('reports operational for all components when every probe succeeds', async () => {
    stubFetch((url) =>
      url.endsWith('/api/health')
        ? Response.json({ status: 'ok', checks: { database: 'up' } })
        : new Response('ok', { status: 200 }),
    );
    const r = await checkPlatform();
    expect(r.components.map((c) => [c.id, c.state])).toEqual([
      ['api', 'operational'],
      ['database', 'operational'],
      ['dashboard', 'operational'],
      ['cdn', 'operational'],
    ]);
    expect(overallState(r.components)).toBe('operational');
    expect(Number.isNaN(Date.parse(r.checkedAt))).toBe(false);
  });

  it('marks database down when the API health reports it, API stays degraded', async () => {
    stubFetch((url) =>
      url.endsWith('/api/health')
        ? Response.json({ status: 'degraded', checks: { database: 'down' } }, { status: 503 })
        : new Response('ok'),
    );
    const r = await checkPlatform();
    expect(r.components.find((c) => c.id === 'database')?.state).toBe('outage');
    expect(r.components.find((c) => c.id === 'api')?.state).toBe('operational');
    expect(overallState(r.components)).toBe('outage');
  });

  it('degrades gracefully when a probe throws, without leaking the error', async () => {
    stubFetch((url) => {
      if (url.includes('app.uploadkit.dev')) throw new Error('ECONNREFUSED secret-host');
      return url.endsWith('/api/health') ? Response.json({ status: 'ok', checks: { database: 'up' } }) : new Response('ok');
    });
    const r = await checkPlatform();
    expect(r.components.find((c) => c.id === 'dashboard')?.state).toBe('outage');
    expect(JSON.stringify(r)).not.toContain('secret-host');
  });

  it('marks API and database unknown when health is unreachable', async () => {
    stubFetch((url) => {
      if (url.endsWith('/api/health')) throw new Error('boom');
      return new Response('ok');
    });
    const r = await checkPlatform();
    expect(r.components.find((c) => c.id === 'api')?.state).toBe('outage');
    expect(r.components.find((c) => c.id === 'database')?.state).toBe('unknown');
  });

  it('treats a CDN 404 for the root as reachable but 5xx as outage', async () => {
    stubFetch((url) =>
      url.includes('cdn.uploadkit.dev') ? new Response('x', { status: 502 }) : url.endsWith('/api/health') ? Response.json({ status: 'ok', checks: { database: 'up' } }) : new Response('ok'),
    );
    const r = await checkPlatform();
    expect(r.components.find((c) => c.id === 'cdn')?.state).toBe('outage');
  });

  it('keeps the API operational with database unknown when /api/health is 404', async () => {
    stubFetch((url) => (url.endsWith('/api/health') ? new Response('nf', { status: 404 }) : new Response('ok')));
    const r = await checkPlatform();
    expect(r.components.find((c) => c.id === 'api')?.state).toBe('operational');
    expect(r.components.find((c) => c.id === 'database')?.state).toBe('unknown');
  });
});
