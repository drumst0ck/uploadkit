import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB, Subscription } from '@uploadkit/db';
import { stripe } from '../../../lib/stripe';
import { createCheckoutSession, createPortalSession } from './actions';
import { Button } from '@uploadkit/ui';
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

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatInvoiceStatus(status: string | null): string {
  if (!status) return '—';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface BillingPageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  const subscription = await Subscription.findOne({ userId: session.user.id }).lean();
  const tier: Tier = subscription?.tier ?? 'FREE';
  const tierInfo = TIER_DESCRIPTIONS[tier];
  const hasPaidSubscription = !!(subscription?.stripeSubscriptionId);

  // T-07-04: Fetch invoices server-side scoped to this user's stripeCustomerId only
  let invoices: {
    id: string;
    date: number;
    amount: number;
    status: string | null;
    hostedUrl: string | null;
  }[] = [];

  if (subscription?.stripeCustomerId) {
    const stripeInvoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    });
    invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid,
      status: inv.status,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));
  }

  const params = await searchParams;
  const showSuccess = params.success === '1';

  const proPriceId = process.env.STRIPE_PRO_PRICE_ID ?? '';
  const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID ?? '';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Billing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-400">
            Subscription activated successfully. Welcome to UploadKit Pro!
          </p>
        </div>
      )}

      {/* Current plan card */}
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
          {/* Upgrade to Pro — shown for FREE users */}
          {tier === 'FREE' && proPriceId && (
            <form action={createCheckoutSession.bind(null, proPriceId)}>
              <Button type="submit">Upgrade to Pro</Button>
            </form>
          )}

          {/* Upgrade to Team — shown for FREE and PRO users */}
          {(tier === 'FREE' || tier === 'PRO') && teamPriceId && (
            <form action={createCheckoutSession.bind(null, teamPriceId)}>
              <Button type="submit" className="bg-violet-500 shadow-violet-500/20 hover:bg-violet-400 hover:shadow-violet-500/30">Upgrade to Team</Button>
            </form>
          )}

          {/* Manage Billing — shown only to paid subscribers */}
          {hasPaidSubscription && (
            <form action={createPortalSession}>
              <Button type="submit" variant="outline">Manage Billing</Button>
            </form>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">Invoice History</h2>

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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-600">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-zinc-400">{formatDate(invoice.date)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatCents(invoice.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : invoice.status === 'open'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-zinc-500/10 text-zinc-400'
                        }`}
                      >
                        {formatInvoiceStatus(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {invoice.hostedUrl ? (
                        <a
                          href={invoice.hostedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
