import { randomUUID } from 'node:crypto';
import { connectDB, File, ImageTransformLock, Project } from '@uploadkitdev/db';
import { UploadKitError } from '@uploadkitdev/shared';
import type { Types } from 'mongoose';

const LEASE_MS = 5 * 60_000;

/** Serialize API quota checks, durable UPLOADING reservations, and completion.
 * Uses the existing uniquely indexed Mongo lease collection, not process memory.
 * A crashed process releases its lease by expiry; contention fails closed.
 */
export async function withUserQuotaLock<T>(userId: Types.ObjectId, work: () => Promise<T>): Promise<T> {
  await connectDB();
  const lockKey = `upload-quota:${userId}`;
  const owner = randomUUID();
  for (let attempt = 0; attempt < 8; attempt++) {
    const now = new Date();
    let acquired = false;
    try {
      const lock = await ImageTransformLock.findOneAndUpdate(
        { lockKey, $or: [{ expiresAt: { $lte: now } }, { owner }] },
        { $set: { owner, expiresAt: new Date(now.getTime() + LEASE_MS) } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      acquired = lock?.owner === owner;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
    }
    if (acquired) {
      try {
        return await work();
      } finally {
        // A failed release must not turn finished work into an error: the lease
        // expires on its own (LEASE_MS), so log and move on.
        try {
          await ImageTransformLock.deleteOne({ lockKey, owner });
        } catch (error) {
          console.error('[quota] Failed to release quota lock; it will expire by lease', error);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
  }
  throw new UploadKitError('UPLOAD_QUOTA_BUSY', 'Upload quota is busy; retry shortly', 503);
}

/** UPLOADING records are durable reservations. Aborting or cleaning their File
 * record releases capacity without another counter to leak or double-decrement.
 * Include every project owned by this user, not only the requesting API key.
 * Call while holding withUserQuotaLock.
 */
export async function reservedUploadUsage(userId: Types.ObjectId): Promise<{ storageUsed: number; uploads: number }> {
  const projectIds = await Project.find({ userId }).distinct('_id');
  const [pending] = await File.aggregate<{ storageUsed: number; uploads: number }>([
    { $match: { projectId: { $in: projectIds }, status: 'UPLOADING' } },
    { $group: { _id: null, storageUsed: { $sum: '$size' }, uploads: { $sum: 1 } } },
  ]);
  return pending ?? { storageUsed: 0, uploads: 0 };
}
