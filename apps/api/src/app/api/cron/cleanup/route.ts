import { type NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { connectDB, File } from '@uploadkit/db';
import { r2Client, R2_BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';
// Prevent static caching of cron response
export const dynamic = 'force-dynamic';

// GET /api/cron/cleanup — orphaned upload cleanup cron job (UPLD-09, D-06)
// Finds UPLOADING files older than 1 hour, aborts stale multipart uploads,
// deletes R2 objects, and removes DB records to prevent orphaned storage accumulation.
//
// Protected by CRON_SECRET (T-03-18) — NOT by API key auth.
// Runs hourly via Vercel Cron (see vercel.json).
export async function GET(req: NextRequest): Promise<NextResponse> {
  // T-03-18: Validate CRON_SECRET header to prevent unauthorized cleanup.
  // Accept both x-cron-secret (manual calls) and Authorization: Bearer (Vercel Cron format).
  const cronSecret = process.env.CRON_SECRET;
  const xCronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!cronSecret || (xCronSecret !== cronSecret && bearerToken !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  // Find UPLOADING files older than 1 hour (D-06)
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const staleFiles = await File.find({ status: 'UPLOADING', createdAt: { $lt: cutoff } });

  // T-03-19: Process in parallel with allSettled — no cascading failure on individual errors
  await Promise.allSettled(
    staleFiles.map(async (file) => {
      // Abort stale multipart upload if uploadId is set
      if (file.uploadId) {
        try {
          await r2Client.send(
            new AbortMultipartUploadCommand({
              Bucket: R2_BUCKET,
              Key: file.key,
              UploadId: file.uploadId,
            }),
          );
        } catch (err) {
          // Upload may already be aborted — log and continue
          console.warn(
            `[cleanup] AbortMultipartUpload failed for key=${file.key} uploadId=${file.uploadId}:`,
            err,
          );
        }
      }

      // Delete the R2 object (may not exist if upload never completed)
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: file.key,
          }),
        );
      } catch (err) {
        // Object may not exist — log and continue
        console.warn(`[cleanup] DeleteObject failed for key=${file.key}:`, err);
      }

      // Remove DB record
      await File.deleteOne({ _id: file._id });
    }),
  );

  console.log(`[cleanup] Processed ${staleFiles.length} stale uploads`);

  return NextResponse.json({
    cleaned: staleFiles.length,
    timestamp: new Date().toISOString(),
  });
}
