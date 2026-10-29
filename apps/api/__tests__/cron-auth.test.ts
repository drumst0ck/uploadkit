import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isCronAuthorized, safeEqual } from '@/lib/secure-compare';

vi.mock('node:crypto', async (orig) => {
  const actual = await orig<typeof import('node:crypto')>();
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

import { timingSafeEqual } from 'node:crypto';

const r = (h: Record<string, string>) => new NextRequest('http://localhost/x', { headers: h });

describe('cron secret comparison', () => {
  it('accepts x-cron-secret and Bearer, rejects others', () => {
    expect(isCronAuthorized(r({ 'x-cron-secret': 'test-cron-secret' }))).toBe(true);
    expect(isCronAuthorized(r({ authorization: 'Bearer test-cron-secret' }))).toBe(true);
    expect(isCronAuthorized(r({ 'x-cron-secret': 'test-cron-secreT' }))).toBe(false);
    expect(isCronAuthorized(r({}))).toBe(false);
  });

  it('uses timingSafeEqual and tolerates different lengths', () => {
    expect(safeEqual('a', 'abcdef')).toBe(false);
    expect(timingSafeEqual).toHaveBeenCalled();
  });

  it('rejects everything when CRON_SECRET is unset', () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(r({ 'x-cron-secret': '' }))).toBe(false);
    process.env.CRON_SECRET = prev;
  });
});
