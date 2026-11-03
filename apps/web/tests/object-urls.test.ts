import { describe, it, expect, vi, afterEach } from 'vitest';
import { revokeDropped } from '@/lib/object-urls';

afterEach(() => vi.unstubAllGlobals());

describe('revokeDropped', () => {
  it('revokes blob: urls of files no longer kept, and only those', () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: revoke }));
    const a = { key: 'a', url: 'blob:http://x/a' };
    const b = { key: 'b', url: 'blob:http://x/b' };
    const c = { key: 'c', url: '#seed' };
    revokeDropped([a, b, c], [a]);
    expect(revoke.mock.calls.map((x) => x[0]).sort()).toEqual(['blob:http://x/b']);
  });
});
