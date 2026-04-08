// T-07-06: raw body MUST be read via req.text() — never req.json().
// Parsing JSON before HMAC verification corrupts the signature check.
export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, Subscription } from '@uploadkit/db';
import { stripe } from '@/lib/stripe';

// Map Stripe subscription status strings to our SubscriptionStatus enum
function mapStripeStatus(
  stripeStatus: string,
): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'trialing':
      return 'TRIALING';
    default:
      return 'ACTIVE';
  }
}

// Map a Stripe price ID to our internal tier name.
// T-07-09: Tier is derived from priceId→env var mapping — never from client-supplied data.
// Unknown price IDs default to 'PRO' (not ENTERPRISE) for conservative billing.
function mapPriceToTier(priceId: string): 'PRO' | 'TEAM' | 'ENTERPRISE' {
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'TEAM';
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'ENTERPRISE';
  // Covers STRIPE_PRO_PRICE_ID and any unknown price IDs (default to PRO — conservative)
  return 'PRO';
}

// POST /api/v1/webhooks/stripe — Stripe webhook handler
//
// NOT protected by withApiKey — authenticated via Stripe HMAC signature verification (T-07-05).
// Per D-02: lives at /api/v1/webhooks/stripe, consistent with QStash DLQ pattern.
//
// Returns 200 for ALL events (including unrecognized ones) to prevent Stripe retry storms (T-07-08).
export async function POST(req: NextRequest): Promise<NextResponse> {
  // T-07-06: Read raw body as text to preserve bytes for HMAC verification.
  // DO NOT use req.json() here — it would reserialize the body, breaking the signature.
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // T-07-05: Verify HMAC signature using Stripe's constructEvent.
  // Reject requests with invalid signatures — prevents spoofed webhook events.
  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[stripe-webhook] Invalid signature:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectDB();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;

        // Extract userId from session metadata — set at checkout creation time
        const userId = session.metadata?.userId;
        if (!userId) {
          console.warn('[stripe-webhook] checkout.session.completed: missing userId in metadata');
          break;
        }

        // Retrieve full subscription object to get price and period info
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id ?? '';
        const tier = mapPriceToTier(priceId);

        // In Stripe dahlia API (2026-03-25), current_period_start/end moved to SubscriptionItem.
        // Extract from the first item, fall back to undefined if not present.
        const firstItem = sub.items.data[0];
        const periodStart = firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000)
          : undefined;
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : undefined;

        // Upsert Subscription record — idempotent via upsert (Pitfall 3: webhook retries safe)
        await Subscription.findOneAndUpdate(
          { userId },
          {
            $set: {
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              stripeCustomerId: session.customer as string,
              tier,
              status: 'ACTIVE',
              ...(periodStart !== undefined ? { currentPeriodStart: periodStart } : {}),
              ...(periodEnd !== undefined ? { currentPeriodEnd: periodEnd } : {}),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          },
          { upsert: true, new: true },
        );

        console.info(`[stripe-webhook] checkout.session.completed: userId=${userId} tier=${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price.id ?? '';
        const tier = mapPriceToTier(priceId);
        const status = mapStripeStatus(sub.status);

        // In Stripe dahlia API, current_period_start/end are per-item, not on the subscription.
        const periodStart = firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000)
          : undefined;
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : undefined;

        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            $set: {
              tier,
              status,
              stripePriceId: priceId,
              ...(periodStart !== undefined ? { currentPeriodStart: periodStart } : {}),
              ...(periodEnd !== undefined ? { currentPeriodEnd: periodEnd } : {}),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          },
        );

        console.info(
          `[stripe-webhook] customer.subscription.updated: subId=${sub.id} tier=${tier} status=${status}`,
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;

        // Downgrade to FREE tier and clear paid subscription fields
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            $set: {
              tier: 'FREE',
              status: 'CANCELED',
              cancelAtPeriodEnd: false,
            },
            $unset: {
              stripeSubscriptionId: '',
              stripePriceId: '',
            },
          },
        );

        console.info(
          `[stripe-webhook] customer.subscription.deleted: subId=${sub.id} → downgraded to FREE`,
        );
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const customerId = invoice.customer as string;

        // If subscription was PAST_DUE, recover to ACTIVE on successful payment
        await Subscription.findOneAndUpdate(
          { stripeCustomerId: customerId, status: 'PAST_DUE' },
          { $set: { status: 'ACTIVE' } },
        );

        console.info(`[stripe-webhook] invoice.paid: customerId=${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Mark subscription as PAST_DUE — access remains until grace period ends
        await Subscription.findOneAndUpdate(
          { stripeCustomerId: customerId },
          { $set: { status: 'PAST_DUE' } },
        );

        console.error(`[stripe-webhook] invoice.payment_failed: customerId=${customerId}`);
        break;
      }

      default:
        // T-07-08: Always return 200 for unrecognized events.
        // Stripe interprets non-2xx as failure and will retry — creating retry storms.
        console.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
        break;
    }
  } catch (err) {
    // Log handler errors but still return 200 to prevent Stripe retry storms (T-07-08).
    // Failed events should be investigated via Stripe dashboard, not via retries.
    console.error('[stripe-webhook] Handler error:', err);
  }

  return NextResponse.json({ received: true });
}
