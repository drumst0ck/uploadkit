import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from './storage';

const DELETE_BATCH_SIZE = 100;

export type R2DeleteFailure = {
  key: string;
  reason: unknown;
};

export async function deleteR2Objects(
  keys: string[],
): Promise<{ deleted: number; failures: R2DeleteFailure[] }> {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  const failures: R2DeleteFailure[] = [];
  let deleted = 0;

  for (let i = 0; i < uniqueKeys.length; i += DELETE_BATCH_SIZE) {
    const batch = uniqueKeys.slice(i, i + DELETE_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((key) =>
        r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })),
      ),
    );

    results.forEach((result, idx) => {
      const key = batch[idx]!;
      if (result.status === 'fulfilled') {
        deleted += 1;
      } else {
        failures.push({ key, reason: result.reason });
      }
    });
  }

  return { deleted, failures };
}
