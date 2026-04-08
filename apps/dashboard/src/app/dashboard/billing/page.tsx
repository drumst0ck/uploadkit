import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB, Subscription } from '@uploadkit/db';
import type { Tier } from '@uploadkit/shared';

export const dynamic = 'force-dynamic';

const TIER_DESCRIPTIONS: Record<Tier, { label: string; description: string }> = {
  FREE: {
    label: 'Free',
    description: '5 GB storage · 2 GB bandwidth · 1,000 uploads/month · 2 projects',
  },
  PRO: {
    label: 'Pro',
    description: '100 GB storage · 200 GB bandwidth · 50,000 uploads/month · 10 projects',
  },
  TEAM: {
    label: 'Team',
    description: '1 TB storage · 2 TB bandwidth · 500,000 uploads/month · 50 projects',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    description: 'Unlimited storage & bandwidth · Custom limits',
  },
};

const TIER_BADGE_CLASS: Record<Tier, string> = {
  FREE: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20',
  PRO: 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20',
  TEAM: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',
  ENTERPRISE: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  // Fetch subscription if exists — Phase 7 will populate this fully via Stripe
  const subscription = await Subscription.findOne({ userId: session.user.id }).lean();
  const tier: Tier = subscription?.tier ?? 'FREE';
  const tierInfo = TIER_DESCRIPTIONS[tier];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Billing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Current plan card — DASH-09 */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-100">Current Plan</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE_CLASS[tier]}`}
              >
                {tierInfo.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500">{tierInfo.description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {/* Upgrade button — disabled until Phase 7 Stripe integration */}
          <button
            disabled
            title="Stripe integration coming in Phase 7"
            className="inline-flex cursor-not-allowed items-center rounded-lg bg-indigo-500/50 px-4 py-2 text-sm font-medium text-white/50 transition-colors"
          >
            Upgrade to Pro
          </button>

          {/* Manage billing — disabled until Phase 7 */}
          <button
            disabled
            title="Stripe Billing Portal coming in Phase 7"
            className="inline-flex cursor-not-allowed items-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-500 transition-colors"
          >
            Manage Billing
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Stripe Checkout and Billing Portal integration coming in Phase 7.
        </p>
      </div>

      {/* Invoice history — placeholder for Phase 7 */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">Invoice History</h2>

        {/* Placeholder table header */}
        <div className="overflow-hidden rounded-lg border border-white/[0.04]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-600">
                  No invoices yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
