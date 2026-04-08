export const runtime = 'nodejs';

import { HeadObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, File, FileRouter, UsageRecord, Subscription, User } from '@uploadkit/db';
import { NotFoundError, TIER_LIMITS } from '@uploadkit/shared';
import { withApiKey } from '@/lib/with-api-key';
import { serializeError, serializeValidationError } from '@/lib/errors';
import { UploadCompleteSchema } from '@/lib/schemas';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { enqueueWebhook } from '@/lib/qstash';
import { sendMeterEvent, METER_STORAGE, METER_UPLOADS } from '@/lib/stripe-meters';
import { sendUsageAlertEmail } from '@uploadkit/emails';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async function handler(req: NextRequest, ctx: import('@/lib/with-api-key').ApiContext) {
  try {
    await connectDB();

    // 1. Parse and validate request body
    const parsed = UploadCompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }

    const { fileId, metadata } = parsed.data;

    // 2. Look up File record — must belong to this project and be in UPLOADING state
    const file = await File.findOne({
      _id: fileId,
      projectId: ctx.project._id,
      status: 'UPLOADING',
    });
    if (!file) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 3. Verify file exists in R2 via HEAD (D-05 step 1, T-03-08)
    // Catch both 403 and 404 — Pitfall 4: R2 may return 403 for missing objects
    // when the bucket has restricted GetObject policies
    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET,
          Key: file.key,
        }),
      );
    } catch (err) {
      if (
        err instanceof S3ServiceException &&
        (err.$response?.statusCode === 404 || err.$response?.statusCode === 403)
      ) {
        return NextResponse.json(
          {
            error: {
              type: 'invalid_request',
              code: 'FILE_NOT_IN_STORAGE',
              message: 'File not found in storage. Upload may not have completed.',
            },
          },
          { status: 422 },
        );
      }
      throw err;
    }

    // 4. Update file status to UPLOADED (D-05 step 2)
    const updatedFile = await File.findByIdAndUpdate(
      file._id,
      {
        $set: {
          status: 'UPLOADED',
          ...(metadata ? { metadata } : {}),
        },
      },
      { new: true },
    );

    if (!updatedFile) {
      return serializeError(new NotFoundError('File', fileId));
    }

    // 5. Atomic usage increment — upsert for current month period (D-05 step 4)
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const newRecord = await UsageRecord.findOneAndUpdate(
      { userId: ctx.project.userId, period },
      { $inc: { storageUsed: file.size, uploads: 1 } },
      { upsert: true, new: true },
    );

    // EMAIL-02: Usage alert emails at 80%/100% threshold crossing (D-08)
    // prevPercent < threshold && newPercent >= threshold ensures one-shot firing (Pitfall 5).
    // All email sends are void (fire-and-forget) — failure must not block upload response.
    if (newRecord) {
      const tierLimits = TIER_LIMITS[ctx.tier];
      const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.uploadkit.dev'}/dashboard/billing`;

      // Storage threshold check
      const prevStorageUsed = newRecord.storageUsed - file.size;
      const storageLimit = tierLimits.maxStorageBytes;
      if (storageLimit !== Infinity) {
        const prevStoragePercent = prevStorageUsed / storageLimit;
        const newStoragePercent = newRecord.storageUsed / storageLimit;

        if (prevStoragePercent < 0.8 && newStoragePercent >= 0.8) {
          const user = await User.findById(ctx.project.userId);
          if (user?.email) {
            void sendUsageAlertEmail(user.email, {
              userName: user.name ?? 'there',
              usagePercent: 80,
              dimension: 'storage',
              currentUsage: formatBytes(newRecord.storageUsed),
              limit: formatBytes(storageLimit),
              tier: ctx.tier,
              upgradeUrl,
            });
          }
        }
        if (prevStoragePercent < 1.0 && newStoragePercent >= 1.0) {
          const user = await User.findById(ctx.project.userId);
          if (user?.email) {
            void sendUsageAlertEmail(user.email, {
              userName: user.name ?? 'there',
              usagePercent: 100,
              dimension: 'storage',
              currentUsage: formatBytes(newRecord.storageUsed),
              limit: formatBytes(storageLimit),
              tier: ctx.tier,
              upgradeUrl,
            });
          }
        }
      }

      // Upload count threshold check
      const prevUploads = newRecord.uploads - 1;
      const uploadLimit = tierLimits.maxUploadsPerMonth;
      if (uploadLimit !== Infinity) {
        const prevUploadPercent = prevUploads / uploadLimit;
        const newUploadPercent = newRecord.uploads / uploadLimit;

        if (prevUploadPercent < 0.8 && newUploadPercent >= 0.8) {
          const user = await User.findById(ctx.project.userId);
          if (user?.email) {
            void sendUsageAlertEmail(user.email, {
              userName: user.name ?? 'there',
              usagePercent: 80,
              dimension: 'uploads',
              currentUsage: `${newRecord.uploads.toLocaleString()} uploads`,
              limit: `${uploadLimit.toLocaleString()} uploads`,
              tier: ctx.tier,
              upgradeUrl,
            });
          }
        }
        if (prevUploadPercent < 1.0 && newUploadPercent >= 1.0) {
          const user = await User.findById(ctx.project.userId);
          if (user?.email) {
            void sendUsageAlertEmail(user.email, {
              userName: user.name ?? 'there',
              usagePercent: 100,
              dimension: 'uploads',
              currentUsage: `${newRecord.uploads.toLocaleString()} uploads`,
              limit: `${uploadLimit.toLocaleString()} uploads`,
              tier: ctx.tier,
              upgradeUrl,
            });
          }
        }
      }
    }

    // 6. Fire Stripe MeterEvents for paid users (BILL-04, D-03)
    // Pitfall 2: Skip entirely for FREE tier — no stripeCustomerId to bill against.
    // identifier = file._id prevents double-counting on retries (T-07-07).
    // Use void + try/catch inside helper — meter failures must not block the response.
    if (ctx.tier !== 'FREE') {
      const subscription = await Subscription.findOne({ userId: ctx.project.userId });
      if (subscription?.stripeCustomerId && subscription.status === 'ACTIVE') {
        void sendMeterEvent(
          METER_STORAGE,
          file.size,
          subscription.stripeCustomerId,
          `storage_${file._id.toString()}`,
        );
        void sendMeterEvent(
          METER_UPLOADS,
          1,
          subscription.stripeCustomerId,
          `upload_${file._id.toString()}`,
        );
      }
    }

    // 7. Enqueue webhook (D-05 step 3, D-09) — fire-and-forget
    // Extract routeSlug from the key pattern: {projectId}/{routeSlug}/{nanoid}/{fileName}
    const routeSlugPart = file.key.split('/')[1];
    const fileRouter = routeSlugPart
      ? await FileRouter.findOne({
          projectId: ctx.project._id,
          slug: routeSlugPart,
        })
      : null;
    if (fileRouter?.webhookUrl) {
      // Fire-and-forget — do not await delivery confirmation
      void enqueueWebhook(fileRouter.webhookUrl, {
        file: {
          id: file._id,
          key: file.key,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          metadata: updatedFile.metadata,
        },
        projectId: ctx.project._id.toString(),
      });
    }

    // 8. Return complete file metadata
    return NextResponse.json({
      file: {
        id: updatedFile._id,
        key: updatedFile.key,
        name: updatedFile.name,
        size: updatedFile.size,
        type: updatedFile.type,
        url: updatedFile.url,
        status: updatedFile.status,
        metadata: updatedFile.metadata,
        createdAt: updatedFile.createdAt,
      },
    });
  } catch (err) {
    return serializeError(err);
  }
}

export const POST = withApiKey(handler, true);
