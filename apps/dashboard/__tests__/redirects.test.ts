import { describe, it, expect } from 'vitest';
import { resolveAuthRedirect, parseInviteCallback } from '@/lib/safe-redirect';

const base = 'https://app.uploadkit.dev';

describe('resolveAuthRedirect', () => {
  it('allows same-origin absolute and relative targets', () => {
    expect(resolveAuthRedirect(`${base}/dashboard/usage`, base)).toBe(`${base}/dashboard/usage`);
    expect(resolveAuthRedirect('/dashboard/team', base)).toBe(`${base}/dashboard/team`);
  });
  it('rejects look-alike origins that merely share the prefix', () => {
    expect(resolveAuthRedirect(`${base}.evil.com/x`, base)).toBe(`${base}/dashboard`);
    expect(resolveAuthRedirect(`${base}@evil.com/x`, base)).toBe(`${base}/dashboard`);
  });
  it('rejects protocol-relative and backslash tricks and foreign origins', () => {
    for (const u of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)']) {
      expect(resolveAuthRedirect(u, base)).toBe(`${base}/dashboard`);
    }
  });
});

describe('parseInviteCallback', () => {
  it('accepts only the invite accept path with a well-formed token', () => {
    const ok = '/dashboard/team/accept?token=' + 'a'.repeat(43);
    expect(parseInviteCallback(ok)).toBe(ok);
    expect(parseInviteCallback('/dashboard/team/accept?token=x')).toBeNull();
    expect(parseInviteCallback('https://evil.com')).toBeNull();
    expect(parseInviteCallback('/dashboard/team/accept?token=' + 'a'.repeat(43) + '&next=//evil')).toBeNull();
    expect(parseInviteCallback(`https://app.x.dev${ok}`)).toBe(ok);
    expect(parseInviteCallback(undefined)).toBeNull();
  });
});
