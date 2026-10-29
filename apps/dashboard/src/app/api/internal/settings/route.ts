import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '../../../../../auth';
import {
  connectDB,
  getAuthMongoClient,
  User,
  Project,
  File,
  ApiKey,
  FileRouter,
  Subscription,
  UsageRecord,
  TeamMember,
  UploadRejection,
  WebhookDelivery,
  ImageTransformation,
} from '@uploadkitdev/db';
import { stripe } from '../../../../lib/stripe';
import { deleteR2Objects } from '../../../../lib/r2-delete';

export const dynamic = 'force-dynamic';

// GET /api/internal/settings
// Returns the authenticated user's profile data.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('name email image notifications')
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT /api/internal/settings
// Updates the user's profile name.
// T-06-14: only name field is updatable; userId from session, never from request body.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ('name' in obj) {
    if (typeof obj['name'] !== 'string') {
      return NextResponse.json({ error: 'Name must be a string.' }, { status: 400 });
    }
    const name = obj['name'].trim();
    // T-06-14: validate name 1-100 chars
    if (name.length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters.' },
        { status: 400 },
      );
    }
    update['name'] = name;
  }

  if ('notifications' in obj) {
    const n = obj['notifications'];
    if (n === null || typeof n !== 'object') {
      return NextResponse.json({ error: 'Invalid notifications payload.' }, { status: 400 });
    }
    const notif = n as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    if ('emailUsageAlerts' in notif) {
      if (typeof notif['emailUsageAlerts'] !== 'boolean') {
        return NextResponse.json({ error: 'emailUsageAlerts must be boolean.' }, { status: 400 });
      }
      next['emailUsageAlerts'] = notif['emailUsageAlerts'];
    }
    if ('emailProductUpdates' in notif) {
      if (typeof notif['emailProductUpdates'] !== 'boolean') {
        return NextResponse.json({ error: 'emailProductUpdates must be boolean.' }, { status: 400 });
      }
      next['emailProductUpdates'] = notif['emailProductUpdates'];
    }
    for (const [k, v] of Object.entries(next)) {
      update[`notifications.${k}`] = v;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  await connectDB();

  const updated = await User.findByIdAndUpdate(
    session.user.id,
    { $set: update },
    { new: true, select: 'name email image notifications' },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/internal/settings
// Permanently deletes the authenticated user's account and all associated data.
// T-06-15: destructive action — requires client-side typed email confirmation before calling.
// Logs deletion event before executing for audit trail.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  await connectDB();

  // Fetch user's projects to cascade delete files and API keys
  const projects = await Project.find({ userId }).select('_id').lean();
  const projectIds = projects.map((p) => p._id);

  // Log deletion event before executing (T-06-15: repudiation mitigation)
  console.info('[account-deletion]', {
    userId,
    projectCount: projectIds.length,
    timestamp: new Date().toISOString(),
  });

  // 1. Cancel the Stripe subscription FIRST: if this fails nothing has been deleted,
  //    so the user keeps access to manage billing and can retry. Idempotent: a
  //    subscription that is already gone counts as canceled.
  const subscription = await Subscription.findOne({ userId }).lean();
  if (subscription?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== 'resource_missing') {
        console.error('[account-deletion] Stripe cancel failed:', err);
        return NextResponse.json(
          { error: 'Failed to cancel subscription. Your account was not deleted.' },
          { status: 502 },
        );
      }
    }
  }

  // 2. Cascade delete (each step is idempotent so a failed attempt can be retried):
  //    files (R2 first) → project-scoped data → projects → user-scoped billing data → user
  if (projectIds.length > 0) {
    const files = await File.find({ projectId: { $in: projectIds } }).select('key').lean();
    const { failures } = await deleteR2Objects(
      files.map((file) => file.key).filter((key): key is string => typeof key === 'string'),
    );

    if (failures.length > 0) {
      failures.forEach((failure) => {
        console.warn(
          `[account-deletion] R2 DeleteObject failed for key=${failure.key}:`,
          failure.reason,
        );
      });

      return NextResponse.json(
        {
          error: 'Failed to delete account files from storage',
          failed: failures.length,
        },
        { status: 502 },
      );
    }

    await File.deleteMany({ projectId: { $in: projectIds } });
    await ApiKey.deleteMany({ projectId: { $in: projectIds } });
    await FileRouter.deleteMany({ projectId: { $in: projectIds } });
    await WebhookDelivery.deleteMany({ projectId: { $in: projectIds } });
    await UploadRejection.deleteMany({ projectId: { $in: projectIds } });
    await ImageTransformation.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ userId });
  }

  // User-scoped billing/team data (personal data must not be orphaned).
  const userObjectIdForDb = new Types.ObjectId(userId);
  await Promise.all([
    Subscription.deleteMany({ userId }),
    UsageRecord.deleteMany({ userId }),
    ImageTransformation.deleteMany({ userId }),
    UploadRejection.deleteMany({ userId }),
    TeamMember.deleteMany({
      $or: [{ ownerUserId: userObjectIdForDb }, { memberUserId: userObjectIdForDb }],
    }),
  ]);

  // Clean up Auth.js adapter collections (accounts + sessions).
  // These live outside Mongoose — deleting the user alone leaves orphaned
  // OAuth account links, which breaks re-signin with E11000 duplicate key
  // errors on the provider_providerAccountId unique index.
  const authClient = await getAuthMongoClient();
  const authDb = authClient.db();
  const userObjectId = new Types.ObjectId(userId);
  await Promise.all([
    authDb.collection('accounts').deleteMany({ userId: userObjectId }),
    authDb.collection('sessions').deleteMany({ userId: userObjectId }),
  ]);

  await User.findByIdAndDelete(userId);

  return NextResponse.json({ deleted: true });
}
