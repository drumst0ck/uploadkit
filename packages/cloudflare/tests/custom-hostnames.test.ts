import { describe, it, expect } from 'vitest';
import { mapCustomHostnameState, type CloudflareConfig } from '../src/custom-hostnames';

const config: CloudflareConfig = {
  apiToken: 'token',
  zoneId: 'zone',
  cnameTarget: 'cname.uploadkit.dev',
  saasFallbackOrigin: 'saas.uploadkit.dev',
  fallbackOrigin: 'cname.uploadkit.dev',
};

describe('mapCustomHostnameState', () => {
  it('maps active hostname', () => {
    const state = mapCustomHostnameState(config, {
      id: 'id-1',
      hostname: 'cdn.acme.com',
      status: 'active',
      ssl: { status: 'active' },
    });
    expect(state.status).toBe('active');
    expect(state.validationRecords[0]).toEqual({
      type: 'cname',
      name: 'cdn.acme.com',
      value: 'cname.uploadkit.dev',
    });
  });

  it('maps pending validation', () => {
    const state = mapCustomHostnameState(config, {
      id: 'id-2',
      hostname: 'cdn.acme.com',
      status: 'pending',
      ssl: { status: 'pending_validation' },
    });
    expect(state.status).toBe('pending_validation');
  });
});
