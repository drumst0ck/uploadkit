import { type NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { connectDB, User, Subscription, Project, File, UsageRecord } from '@uploadkitdev/db';
import { sendInactiveWarningEmail } from '@uploadkitdev/emails';
import { r2Client, R2_BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/inactive-cleanup
// Runs daily. For every free-tier user whose lastLoginAt is older than:
//   - 23 days → sends a "cleanup in 7 days" warning email (once per cycle)
//   - 30 days → permanently deletes their R2 objects + soft-deletes File rows
//               + decrements UsageRecord.storageUsed for the current period
//
// Users with an ACTIVE, PAST_DUE or TRIALING subscription are completely
// exempt — their data is never touched by this job.
//
// Protected by CRON_SECRET (same pattern as /api/cron/cleanup).
// Supports ?dry=1 for rehearsal — logs what would happen without mutating.
// ─────────────────────────────────────────────────────────────────────────────

const WARN_DAYS = 23;
const DELETE_DAYS = 30;
const EXEMPT_STATUSES = ['ACTIVE', 'PAST_DUE', 'TRIALING'] as const;

interface CleanupReport {
  timestamp: string;
  dryRun: boolean;
  warned: number;
  deleted: number;
  filesRemoved: number;
  bytesReclaimed: number;
  errors: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth — same dual-header pattern as the existing cleanup cron
  const cronSecret = process.env.CRON_SECRET;
  const xCronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!cronSecret || (xCronSecret !== cronSecret && bearerToken !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1';
  await connectDB();

  const now = new Date();
  const warnCutoff = new Date(now.getTime() - WARN_DAYS * 24 * 60 * 60 * 1000);
  const deleteCutoff = new Date(now.getTime() - DELETE_DAYS * 24 * 60 * 60 * 1000);
  const period = now.toISOString().slice(0, 7); // "YYYY-MM"

  // Exempt set — userIds with a paying subscription
  const paying = await Subscription.find({ status: { $in: EXEMPT_STATUSES as unknown as string[] } })
    .select('userId')
    .lean();
  const exemptIds = new Set(paying.map((s) => String(s.userId)));

  const report: CleanupReport = {
    timestamp: now.toISOString(),
    dryRun,
    warned: 0,
    deleted: 0,
    filesRemoved: 0,
    bytesReclaimed: 0,
    errors: 0,
  };

  // ─── 1. DELETE phase — files for users inactive ≥ 30 days ──────────────────
  const toDelete = await User.find({
    lastLoginAt: { $lt: deleteCutoff },
  })
    .select('_id name email')
    .lean();

  for (const user of toDelete) {
    if (exemptIds.has(String(user._id))) continue;

    try {
      // Gather every File across every project owned by this user
      const projects = await Project.find({ userId: user._id }).select('_id').lean();
      if (projects.length === 0) {
        report.deleted += 1;
        continue;
      }
      const projectIds = projects.map((p) => p._id);

      const files = await File.find({
        projectId: { $in: projectIds },
        deletedAt: null,
      })
        .select('_id key size')
        .lean();

      if (files.length === 0) {
        report.deleted += 1;
        continue;
      }

      let userBytes = 0;
      for (const f of files) userBytes += f.size ?? 0;

      if (dryRun) {
        console.info('[inactive-cleanup] DRY would delete', {
          userId: String(user._id),
          email: user.email,
          fileCount: files.length,
          bytes: userBytes,
        });
        report.deleted += 1;
        report.filesRemoved += files.length;
        report.bytesReclaimed += userBytes;
        continue;
      }

      // Fire R2 deletes in parallel — idempotent, tolerate individual failures
      const r2Results = await Promise.allSettled(
        files.map((f) =>
          r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: f.key })),
        ),
      );

      const successIds: typeof files[number]['_id'][] = [];
      let successBytes = 0;
      r2Results.forEach((result, idx) => {
        const f = files[idx]!;
        if (result.status === 'fulfilled') {
          successIds.push(f._id);
          successBytes += f.size ?? 0;
        } else {
          report.errors += 1;
          console.warn(
            `[inactive-cleanup] R2 delete failed key=${f.key}:`,
            result.reason,
          );
        }
      });

      if (successIds.length > 0) {
        await File.updateMany(
          { _id: { $in: successIds } },
          { $set: { deletedAt: now, status: 'DELETED' } },
        );
        await UsageRecord.findOneAndUpdate(
          { userId: user._id, period },
          { $inc: { storageUsed: -successBytes } },
          { upsert: true },
        );
      }

      report.deleted += 1;
      report.filesRemoved += successIds.length;
      report.bytesReclaimed += successBytes;

      console.info('[inactive-cleanup] deleted', {
        userId: String(user._id),
        email: user.email,
        files: successIds.length,
        bytes: successBytes,
      });
    } catch (err) {
      report.errors += 1;
      console.error('[inactive-cleanup] user delete failed', user._id, err);
    }
  }

  // ─── 2. WARN phase — users inactive ≥ 23 days (and not already warned) ────
  // Excludes users already past 30 days (handled above) to avoid double-hitting
  // the same address in a single run.
  const toWarn = await User.find({
    lastLoginAt: { $lt: warnCutoff, $gte: deleteCutoff },
    email: { $exists: true, $ne: null },
  })
    .select('_id name email lastLoginAt inactiveWarningSentAt')
    .lean();

  for (const user of toWarn) {
    if (exemptIds.has(String(user._id))) continue;
    if (!user.email) continue;

    // Skip if we already warned this user since their last login
    if (
      user.inactiveWarningSentAt &&
      user.lastLoginAt &&
      user.inactiveWarningSentAt > user.lastLoginAt
    ) {
      continue;
    }

    try {
      // Compute at-risk snapshot for the email body
      const projects = await Project.find({ userId: user._id }).select('_id').lean();
      const projectIds = projects.map((p) => p._id);
      let fileCount = 0;
      let bytes = 0;
      if (projectIds.length > 0) {
        const [count, agg] = await Promise.all([
          File.countDocuments({ projectId: { $in: projectIds }, deletedAt: null }),
          File.aggregate<{ _id: null; total: number }>([
            { $match: { projectId: { $in: projectIds }, deletedAt: null } },
            { $group: { _id: null, total: { $sum: '$size' } } },
          ]),
        ]);
        fileCount = count;
        bytes = agg[0]?.total ?? 0;
      }

      const lastLogin = user.lastLoginAt ?? new Date(0);
      const msInactive = now.getTime() - lastLogin.getTime();
      const daysInactive = Math.floor(msInactive / (24 * 60 * 60 * 1000));
      const daysUntilDeletion = Math.max(1, DELETE_DAYS - daysInactive);

      if (dryRun) {
        console.info('[inactive-cleanup] DRY would warn', {
          userId: String(user._id),
          email: user.email,
          daysUntilDeletion,
          fileCount,
          bytes,
        });
        report.warned += 1;
        continue;
      }

      await sendInactiveWarningEmail(user.email, {
        userName: user.name ?? 'there',
        daysUntilDeletion,
        fileCount,
        storageHuman: formatBytes(bytes),
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.uploadkit.dev'}/dashboard`,
      });

      await User.updateOne(
        { _id: user._id },
        { $set: { inactiveWarningSentAt: now } },
      );

      report.warned += 1;
    } catch (err) {
      report.errors += 1;
      console.error('[inactive-cleanup] warn failed', user._id, err);
    }
  }

  console.info('[inactive-cleanup] done', report);
  return NextResponse.json(report);
}
