import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  files: [] as { _id: number; key: string }[],
  findLimits: [] as number[],
  failKeys: new Set<string>(),
  r2Batches: [] as number[],
}));

vi.mock('@uploadkitdev/db', () => ({
  File: {
    find: (q: any) => ({
      sort: () => ({
        limit: (n: number) => ({
          select: () => ({ lean: async () => { h.findLimits.push(n); return h.files.slice(0, n); } }),
        }),
      }),
    }),
    deleteMany: async (q: any) => {
      const ids = new Set(q._id.$in);
      h.files = h.files.filter((f) => !ids.has(f._id));
    },
  },
}));
vi.mock('@/lib/r2-delete', () => ({
  deleteR2Objects: async (keys: string[]) => {
    h.r2Batches.push(keys.length);
    const failures = keys.filter((k) => h.failKeys.has(k)).map((key) => ({ key, reason: 'x' }));
    return { deleted: keys.length - failures.length, failures };
  },
}));

import { deleteProjectFilesInBatches } from '@/lib/delete-files';

beforeEach(() => {
  h.files = Array.from({ length: 1234 }, (_, i) => ({ _id: i, key: `k${i}` }));
  h.findLimits = [];
  h.failKeys.clear();
  h.r2Batches = [];
});

describe('row 35: batched deletion', () => {
  it('never loads or deletes more than one batch at a time and removes everything', async () => {
    const res = await deleteProjectFilesInBatches(['p1'] as any);
    expect(res).toEqual({ ok: true, deleted: 1234 });
    expect(h.files).toHaveLength(0);
    expect(Math.max(...h.findLimits)).toBeLessThanOrEqual(500);
    expect(Math.max(...h.r2Batches)).toBeLessThanOrEqual(500);
  });
  it('stops at the first failing batch and keeps remaining rows so it can be resumed', async () => {
    h.failKeys.add('k700');
    const res = await deleteProjectFilesInBatches(['p1'] as any);
    expect(res.ok).toBe(false);
    expect(h.files.length).toBeGreaterThan(0);
    h.failKeys.clear();
    expect((await deleteProjectFilesInBatches(['p1'] as any)).ok).toBe(true);
    expect(h.files).toHaveLength(0);
  });
});
