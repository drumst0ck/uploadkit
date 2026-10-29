// T-07-06: raw body MUST be read via req.text() — never req.json().
// Parsing JSON before HMAC verification corrupts the signature check.
export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, Subscription, StripeEvent } from '@uploadkitdev/db';
import { stripe } from '@/lib/stripe';
import { sendInvoiceEmail } from '@uploadkitdev/emails';
import { sendXPurchaseConversion } from '@/lib/x-conversions';

type MappedStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

// Map Stripe subscription status strings to our SubscriptionStatus enum and
// decide whether the paid tier may stay granted. Fail safe: unknown statuses
// never grant paid access.
//  - active / trialing: paid access
//  - past_due: Stripe is still retrying the charge; keep access during dunning
//  - unpaid / incomplete / paused: no access until Stripe reports active again
//  - canceled / incomplete_expired: terminal, no access
function resolveStripeStatus(stripeStatus: string): {
  status: MappedStatus;
  paidAccess: boolean;
} {
  switch (stripeStatus) {
    case 'active':
      return { status: 'ACTIVE', paidAccess: true };
    case 'trialing':
      return { status: 'TRIALING', paidAccess: true };
    case 'past_due':
      return { status: 'PAST_DUE', paidAccess: true };
    case 'canceled':
    case 'incomplete_expired':
      return { status: 'CANCELED', paidAccess: false };
    case 'unpaid':
    case 'incomplete':
    case 'paused':
    default:
      return { status: 'PAST_DUE', paidAccess: false };
  }
}

// Map a Stripe price ID to our internal tier name.
// T-07-09: Tier is derived from priceId→env var mapping — never from client-supplied data.
// Unknown price IDs throw — prevents silent wrong-tier assignment.
function mapPriceToTier(priceId: string): 'PRO' | 'TEAM' | 'ENTERPRISE' {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'PRO';
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'TEAM';
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'ENTERPRISE';
  console.error('[stripe-webhook] Unknown priceId:', priceId);
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}

// POST /api/v1/webhooks/stripe — Stripe webhook handler
//
// NOT protected by withApiKey — authenticated via Stripe HMAC signature verification (T-07-05).
// Per D-02: lives at /api/v1/webhooks/stripe, consistent with QStash DLQ pattern.
//
// Returns 200 for unrecognized events and for duplicates of already-processed events.
// Handler failures return 500 (and release the idempotency claim) so Stripe retries.
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

  // Idempotency: atomically claim event.id. Stripe redelivers events (and retries
  // after failures); a processed event must not re-send emails/conversions.
  const STALE_LOCK_MS = 5 * 60 * 1000;
  try {
    await StripeEvent.create({ eventId: event.id, type: event.type, status: 'processing' });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) {
      console.error('[stripe-webhook] Idempotency claim failed:', err);
      return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
    }
    const existing = await StripeEvent.findOne({ eventId: event.id }).lean();
    if (existing?.status === 'done') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Still processing: only take over if the previous attempt's lock is stale (crash).
    const reclaimed = await StripeEvent.findOneAndUpdate(
      { eventId: event.id, status: 'processing', lockedAt: { $lt: new Date(Date.now() - STALE_LOCK_MS) } },
      { $set: { lockedAt: new Date() } },
    );
    if (!reclaimed) {
      return NextResponse.json({ error: 'Event is being processed' }, { status: 409 });
    }
  }

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

        // A second checkout for a user who already has a live, different subscription
        // (double click / two tabs) must not overwrite stripeSubscriptionId — that would
        // leave the first subscription billing with no reference. Cancel the duplicate.
        const current = await Subscription.findOne({ userId }).lean();
        if (
          current?.stripeSubscriptionId &&
          current.stripeSubscriptionId !== sub.id &&
          (current.status === 'ACTIVE' || current.status === 'TRIALING') &&
          current.tier !== 'FREE'
        ) {
          console.error(
            `[stripe-webhook] duplicate subscription ${sub.id} for userId=${userId} (live: ${current.stripeSubscriptionId}) — canceling duplicate`,
          );
          await stripe.subscriptions.cancel(sub.id);
          break;
        }

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
        const { status, paidAccess } = resolveStripeStatus(sub.status);
        const tier = paidAccess ? mapPriceToTier(priceId) : 'FREE';

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

        // EMAIL-03: Payment received email (fire-and-forget, T-07-16)
        // Customer email retrieved from Stripe API (authenticated), not from webhook payload.
        const paidCustomer = await stripe.customers.retrieve(customerId);
        if (paidCustomer && !paidCustomer.deleted) {
          const paidEmail = paidCustomer.email;
          if (typeof paidEmail === 'string') {
            void sendInvoiceEmail(paidEmail, {
              userName: paidCustomer.name ?? 'there',
              type: 'paid',
              amount: `$${(invoice.amount_paid / 100).toFixed(2)}`,
              ...(invoice.hosted_invoice_url ? { invoiceUrl: invoice.hosted_invoice_url } : {}),
              date: new Date(invoice.created * 1000).toLocaleDateString('en-US'),
            });
          }

          if (
            invoice.billing_reason === 'subscription_create' &&
            invoice.amount_paid > 0
          ) {
            const subscriptionMetadata =
              invoice.parent?.type === 'subscription_details'
                ? invoice.parent.subscription_details?.metadata
                : null;
            const paidAt = invoice.status_transitions.paid_at ?? invoice.created;

            await sendXPurchaseConversion({
              conversionId: invoice.id,
              conversionTime: new Date(paidAt * 1000).toISOString(),
              currency: invoice.currency,
              value: invoice.amount_paid / 100,
              ...(paidEmail ? { email: paidEmail } : {}),
              ...(subscriptionMetadata?.xTwclid
                ? { twclid: subscriptionMetadata.xTwclid }
                : {}),
              ...(subscriptionMetadata?.tier ? { plan: subscriptionMetadata.tier } : {}),
            });
          }
        }

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

        // EMAIL-03: Payment failed email (fire-and-forget, T-07-16)
        // Customer email retrieved from Stripe API (authenticated), not from webhook payload.
        const failedCustomer = await stripe.customers.retrieve(customerId);
        if (failedCustomer && !failedCustomer.deleted) {
          const failedEmail = failedCustomer.email;
          if (typeof failedEmail === 'string') {
            void sendInvoiceEmail(failedEmail, {
              userName: failedCustomer.name ?? 'there',
              type: 'failed',
              amount: `$${(invoice.amount_due / 100).toFixed(2)}`,
              ...(invoice.hosted_invoice_url ? { invoiceUrl: invoice.hosted_invoice_url } : {}),
              date: new Date(invoice.created * 1000).toLocaleDateString('en-US'),
            });
          }
        }

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
    // Transient/unknown failure: release the claim and return 500 so Stripe retries
    // (with backoff, up to ~3 days) instead of silently losing the event.
    console.error('[stripe-webhook] Handler error:', err);
    await StripeEvent.deleteOne({ eventId: event.id }).catch(() => undefined);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  await StripeEvent.updateOne({ eventId: event.id }, { $set: { status: 'done' } }).catch((err) =>
    console.error('[stripe-webhook] Failed to mark event done:', err),
  );

  return NextResponse.json({ received: true });
}
