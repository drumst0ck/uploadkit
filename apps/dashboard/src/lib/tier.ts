import { connectDB, Subscription } from '@uploadkitdev/db';
import type { Tier } from '@uploadkitdev/shared';

export async function getUserTier(userId: string): Promise<Tier> {
  await connectDB();
  const subscription = await Subscription.findOne({ userId }).lean();
  return subscription?.tier ?? 'FREE';
}
