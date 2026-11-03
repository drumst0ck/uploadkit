import { describe, it, expect } from 'vitest';
import { parseIsoDate } from '@/lib/blog-date';

describe('parseIsoDate', () => {
  it('accepts YYYY-MM-DD strings and Date objects', () => {
    expect(parseIsoDate('2026-04-18', 'publishedAt', 'x')).toBe('2026-04-18');
    expect(parseIsoDate(new Date('2026-04-18T00:00:00Z'), 'publishedAt', 'x')).toBe('2026-04-18');
  });
  it.each(['not-a-date', '2026-13-45', '', '18/04/2026', undefined, 42])('rejects %s naming the post and field', (bad) => {
    expect(() => parseIsoDate(bad, 'publishedAt', 'my-post')).toThrow(/my-post.*publishedAt/);
  });
  it('rejects an invalid Date object', () => {
    expect(() => parseIsoDate(new Date('nope'), 'updatedAt', 'p')).toThrow(/updatedAt/);
  });
});
