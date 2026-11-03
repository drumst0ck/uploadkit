import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

describe('published presign endpoint snippets', () => {
  it.each(['src/app/sveltekit/page.tsx', 'src/app/remix/page.tsx'])('%s authenticates before signing and says so', (p) => {
    const s = src(p);
    const sign = s.indexOf('getSignedUrl(');
    const auth = s.search(/Unauthorized/);
    expect(auth).toBeGreaterThan(-1);
    expect(auth).toBeLessThan(sign);
    expect(s).toMatch(/Never expose this endpoint without authentication/);
  });
});

describe('BYOS snippets use one set of env names', () => {
  it('no divergent R2 env names in web sources and posts', () => {
    const files = ['src/components/home/sections.tsx', 'src/app/sveltekit/page.tsx', 'src/app/remix/page.tsx', 'src/app/byos/page.tsx'];
    for (const f of files) {
      const s = src(f);
      expect(s, f).not.toMatch(/R2_SECRET\b(?!_)/);
      expect(s, f).not.toMatch(/R2_BUCKET\b(?!_)/);
    }
  });

  it.each([
    'sveltekit/src/routes/api/sign/+server.ts',
    'remix/app/routes/api.sign.ts',
  ])('the %s template the page copies reads R2_BUCKET_NAME', (p) => {
    const s = src(`../../packages/create-uploadkit-app/templates/${p}`);
    expect(s).toMatch(/R2_BUCKET_NAME/);
  });
});
