import { File } from '@uploadkitdev/db';
import type { Types } from 'mongoose';

/** Real file totals for a set of projects (not limited to a page of recent files). */
export async function getUserFileStats(projectIds: Types.ObjectId[]) {
  const rows = await File.aggregate<{ _id: unknown; count: number; size: number }>([
    { $match: { projectId: { $in: projectIds }, deletedAt: null } },
    { $group: { _id: '$projectId', count: { $sum: 1 }, size: { $sum: '$size' } } },
  ]);
  const byProject = new Map<string, number>();
  let total = 0;
  let totalSize = 0;
  for (const r of rows) {
    byProject.set(String(r._id), r.count);
    total += r.count;
    totalSize += r.size;
  }
  return { total, totalSize, byProject };
}
