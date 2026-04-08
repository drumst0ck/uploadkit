import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectDB, UsageRecord, Subscription } from '@uploadkit/db';
import type { Tier } from '@uploadkit/shared';

export const dynamic = 'force-dynamic';

// GET /api/internal/usage
// Returns current period usage, 6-month history, and user tier.
// T-06-16: all queries filter by userId from session — no cross-user data access.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const userId = session.user.id;

  // Determine current billing period (YYYY-MM)
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get user tier from subscription or default to FREE
  const subscription = await Subscription.findOne({ userId }).lean();
  const tier: Tier = subscription?.tier ?? 'FREE';

  // Current period usage
  const current = await UsageRecord.findOne({ userId, period: currentPeriod }).lean();

  // Last 6 months history (sorted newest first)
  const history = await UsageRecord.find({ userId })
    .sort({ period: -1 })
    .limit(6)
    .lean();

  return NextResponse.json({
    current: {
      storageUsed: current?.storageUsed ?? 0,
      bandwidth: current?.bandwidth ?? 0,
      uploads: current?.uploads ?? 0,
    },
    history: history.map((r) => ({
      period: r.period,
      storageUsed: r.storageUsed,
      bandwidth: r.bandwidth,
      uploads: r.uploads,
    })),
    tier,
    currentPeriod,
  });
}
