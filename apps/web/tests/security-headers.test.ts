import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config';

describe('web security headers', () => {
  it('serves CSP, HSTS, framing, nosniff and referrer headers on every path', async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.source === '/:path*')!;
    const h = Object.fromEntries(rule.headers.map((x) => [x.key, x.value]));
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/);
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    const csp = h['Content-Security-Policy']!;
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
  });
});
