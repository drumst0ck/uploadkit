import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { File } from '@uploadkitdev/db';
import { TIER_LIMITS, type Tier } from '@uploadkitdev/shared';
import type { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { isTypeAllowed } from '@/lib/upload-types';

export interface StoredObjectHead {
  ContentLength?: number | undefined;
  ContentType?: string | undefined;
}

type Verdict =
  | { ok: true; size: number; type: string }
  | { ok: false; code: 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED'; message: string };

/** Compare the HEAD of the stored object with what was declared at upload time.
 * The real stored size/type are authoritative; objects that break the route or
 * tier limits are rejected. A missing HEAD field falls back to the declared value.
 */
export function inspectStoredObject(
  file: { size: number; type: string },
  head: StoredObjectHead | undefined,
  fileRouter: { maxFileSize?: number; allowedTypes?: string[] } | null,
  tier: Tier,
): Verdict {
  const size = typeof head?.ContentLength === 'number' && head.ContentLength >= 0 ? head.ContentLength : file.size;
  const storedType = head?.ContentType?.split(';')[0]?.trim().toLowerCase();
  const limit = Math.min(fileRouter?.maxFileSize ?? Infinity, TIER_LIMITS[tier].maxFileSizeBytes);
  if (size > limit) {
    return { ok: false, code: 'FILE_TOO_LARGE', message: 'Uploaded object exceeds the allowed file size and was removed.' };
  }
  if (storedType && fileRouter?.allowedTypes && !isTypeAllowed(fileRouter.allowedTypes, storedType)) {
    return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED', message: 'Uploaded object type is not allowed and was removed.' };
  }
  return { ok: true, size, type: storedType || file.type };
}

/** Remove a rejected object and retire its UPLOADING record without counting usage. */
export async function rejectStoredObject(
  file: { _id: Types.ObjectId; key: string },
  verdict: Extract<Verdict, { ok: false }>,
): Promise<NextResponse> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key }));
  await File.findOneAndUpdate(
    { _id: file._id, status: 'UPLOADING' },
    { $set: { status: 'DELETED', deletedAt: new Date() } },
  );
  return NextResponse.json(
    { error: { type: 'invalid_request', code: verdict.code, message: verdict.message } },
    { status: 400 },
  );
}
