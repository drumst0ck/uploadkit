import { describe, it, expect } from 'vitest';
import { buildFileCdnUrl, resolveProjectCdnBaseUrl } from '../src/cdn-url';

describe('cdn-url', () => {
  it('uses default CDN when custom domain not verified', () => {
    expect(
      resolveProjectCdnBaseUrl(
        { customCdnDomain: 'cdn.acme.com', customCdnVerified: false },
        'https://cdn.uploadkit.dev',
      ),
    ).toBe('https://cdn.uploadkit.dev');
  });

  it('uses custom domain when verified', () => {
    expect(
      resolveProjectCdnBaseUrl(
        { customCdnDomain: 'cdn.acme.com', customCdnVerified: true },
        'https://cdn.uploadkit.dev',
      ),
    ).toBe('https://cdn.acme.com');
  });

  it('builds file URL with project custom domain', () => {
    expect(
      buildFileCdnUrl(
        { customCdnDomain: 'cdn.acme.com', customCdnVerified: true },
        'https://cdn.uploadkit.dev',
        'proj/route/abc/photo.jpg',
      ),
    ).toBe('https://cdn.acme.com/proj/route/abc/photo.jpg');
  });
});
