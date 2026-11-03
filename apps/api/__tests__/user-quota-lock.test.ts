import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ deleteOne: vi.fn() }));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(),
  File: {}, Project: {},
  ImageTransformLock: {
    findOneAndUpdate: vi.fn((_filter: any, update: any) => ({ lean: async () => ({ owner: update.$set.owner }) })),
    deleteOne: db.deleteOne,
  },
}));
import { withUserQuotaLock } from '@/lib/user-quota';

beforeEach(() => { db.deleteOne.mockReset(); });

describe('quota lock release', () => {
  it('returns the completed work result when releasing the lock fails', async () => {
    db.deleteOne.mockRejectedValue(new Error('mongo down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(withUserQuotaLock({ toString: () => 'user' } as any, async () => 'done')).resolves.toBe('done');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('quota lock'), expect.any(Error));
    error.mockRestore();
  });
  it('still propagates the work error and releases the lock', async () => {
    db.deleteOne.mockResolvedValue({});
    await expect(withUserQuotaLock({ toString: () => 'user' } as any, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(db.deleteOne).toHaveBeenCalledOnce();
  });
});
