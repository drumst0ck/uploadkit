import { AbortMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { File, UsageRecord } from '@uploadkitdev/db';
import type { Types } from 'mongoose';
import { r2Client, R2_BUCKET } from '@/lib/storage';

/** Keep failed storage deletions retryable. A conditional transition prevents
 * overlapping lifecycle/project-delete runs from reclaiming the same bytes twice.
 */
export async function deleteStoredFile(
  file: { _id: Types.ObjectId; key: string; uploadId?: string | null },
  userId: Types.ObjectId,
  expectedStatus?: 'UPLOADED',
): Promise<boolean> {
  if (file.uploadId) {
    try {
      await r2Client.send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: file.key, UploadId: file.uploadId }));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'NoSuchUpload') throw error;
    }
  }
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key }));
  const previous = await File.findOneAndUpdate(
    { _id: file._id, status: expectedStatus ?? { $ne: 'DELETED' } },
    { $set: { status: 'DELETED', deletedAt: new Date() } },
    { new: false },
  );
  if (!previous) return false;
  if (previous.status === 'UPLOADED') {
    await UsageRecord.findOneAndUpdate(
      { userId, period: new Date().toISOString().slice(0, 7) },
      { $inc: { storageUsed: -previous.size } },
    );
  }
  return true;
}
