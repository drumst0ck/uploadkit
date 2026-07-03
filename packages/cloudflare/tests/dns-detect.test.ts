import { describe, it, expect } from 'vitest';
import {
  dnsRecordName,
  guessApexDomain,
  isCloudflareNameserver,
} from '../src/dns-detect';
import { findZoneForHostname } from '../src/oauth-dns';

describe('guessApexDomain', () => {
  it('returns two-label apex', () => {
    expect(guessApexDomain('cdn.acme.com')).toBe('acme.com');
  });

  it('returns hostname when already apex', () => {
    expect(guessApexDomain('acme.com')).toBe('acme.com');
  });
});

describe('isCloudflareNameserver', () => {
  it('detects cloudflare NS', () => {
    expect(isCloudflareNameserver('ada.ns.cloudflare.com')).toBe(true);
    expect(isCloudflareNameserver('ns1.example.com')).toBe(false);
  });
});

describe('dnsRecordName', () => {
  it('maps subdomain to relative name', () => {
    expect(dnsRecordName('cdn.acme.com', 'acme.com')).toBe('cdn');
    expect(dnsRecordName('cdn.sub.acme.com', 'sub.acme.com')).toBe('cdn');
    expect(dnsRecordName('acme.com', 'acme.com')).toBe('@');
  });
});

describe('findZoneForHostname', () => {
  it('picks the longest matching zone', () => {
    const zones = [
      { id: '1', name: 'acme.com' },
      { id: '2', name: 'sub.acme.com' },
    ];
    expect(findZoneForHostname(zones, 'cdn.sub.acme.com')?.id).toBe('2');
    expect(findZoneForHostname(zones, 'cdn.acme.com')?.id).toBe('1');
  });
});
