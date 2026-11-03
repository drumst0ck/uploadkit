import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '@/lib/json-ld';

describe('serializeJsonLd', () => {
  it('escapes < so content cannot close the script tag, and round-trips', () => {
    const data = { headline: 'x</script><script>alert(1)</script>' };
    const out = serializeJsonLd(data);
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual(data);
  });
});
