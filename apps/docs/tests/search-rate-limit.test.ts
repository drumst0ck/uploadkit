import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to max per window per key, then blocks, and recovers after the window', () => {
    let now = 0;
    const rl = createRateLimiter({ max: 3, windowMs: 1000, now: () => now });
    expect([1, 2, 3].map(() => rl.check('1.1.1.1'))).toEqual([true, true, true]);
    expect(rl.check('1.1.1.1')).toBe(false);
    expect(rl.check('2.2.2.2')).toBe(true);
    now = 1001;
    expect(rl.check('1.1.1.1')).toBe(true);
  });
  it('does not limit when there is no key', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(rl.check(null)).toBe(true);
    expect(rl.check(null)).toBe(true);
  });
  it('bounds memory by evicting expired entries', () => {
    let now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 10, maxKeys: 5, now: () => now });
    for (let i = 0; i < 5; i++) rl.check(`k${i}`);
    now = 20;
    rl.check('new');
    expect(rl.size()).toBeLessThanOrEqual(5);
  });
});
