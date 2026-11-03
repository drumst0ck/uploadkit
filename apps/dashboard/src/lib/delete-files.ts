import type { Types } from 'mongoose';
import { File } from '@uploadkitdev/db';
import { deleteR2Objects } from './r2-delete';

const BATCH_SIZE = 500;

export type DeleteFilesResult =
  | { ok: true; deleted: number }
  | { ok: false; deleted: number; failed: number };

/**
 * Delete every file of the given projects from R2 and the database one bounded batch at a time.
 * Rows are removed as their objects are, so a failed run leaves exactly the remaining files and
 * can simply be retried (resumable) without ever holding all keys in memory.
 */
export async function deleteProjectFilesInBatches(
  projectIds: Types.ObjectId[],
): Promise<DeleteFilesResult> {
  let deleted = 0;
  for (;;) {
    const batch = await File.find({ projectId: { $in: projectIds } })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .select('key')
      .lean();
    if (batch.length === 0) return { ok: true, deleted };

    const { failures } = await deleteR2Objects(
      batch.map((f) => f.key).filter((k): k is string => typeof k === 'string'),
    );
    const failedKeys = new Set(failures.map((f) => f.key));
    failures.forEach((f) =>
      console.warn(`[file-deletion] R2 DeleteObject failed for key=${f.key}:`, f.reason),
    );

    const doneIds = batch.filter((f) => !failedKeys.has(f.key)).map((f) => f._id);
    if (doneIds.length > 0) await File.deleteMany({ _id: { $in: doneIds } });
    deleted += doneIds.length;

    if (failures.length > 0) return { ok: false, deleted, failed: failures.length };
  }
}
