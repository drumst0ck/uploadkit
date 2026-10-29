import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, Subscription, User } from '@uploadkitdev/db';
import { stripe } from '../../../../../lib/stripe';
import { requireInternalSecret } from '../../../../../lib/secure-compare';
import { getAppUrl } from '../../../../../lib/app-url';
import { serializeError, serializeValidationError } from '../../../../../lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid userId'),
  priceId: z.string().min(1),
  twclid: z.string().regex(/^[A-Za-z0-9._-]{1,256}$/).optional(),
});

/**
 * POST /api/v1/billing/checkout
 *
 * Creates a Stripe Checkout Session for subscription purchase.
 * Called from the dashboard server actions — protected by internal secret header.
 *
 * Security (T-07-01, T-07-02):
 *   - userId comes from the caller's session (dashboard server action) — never from client body
 *   - priceId validated against known env var values — unknown prices rejected with 400
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Internal route protection: fails closed (503) if INTERNAL_API_SECRET is unset.
    const denied = requireInternalSecret(req);
    if (denied) return denied;

    const body: unknown = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }
    const { userId, priceId, twclid } = parsed.data;

    // T-07-02: Validate priceId against known values — reject unknown prices
    const validPriceIds = [
      process.env.STRIPE_PRO_PRICE_ID,
      process.env.STRIPE_TEAM_PRICE_ID,
    ].filter(Boolean);

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'INVALID_PRICE', message: 'Unknown price ID' } },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await Subscription.findOne({ userId });

    // Never create a second subscription for a user that already has a live one:
    // the dashboard sends them to the Billing Portal to change plans instead.
    if (
      existing?.stripeSubscriptionId &&
      (existing.status === 'ACTIVE' || existing.status === 'TRIALING') &&
      existing.tier !== 'FREE'
    ) {
      return NextResponse.json(
        {
          error: {
            type: 'invalid_request',
            code: 'ALREADY_SUBSCRIBED',
            message: 'An active subscription already exists. Manage it from the billing portal.',
          },
        },
        { status: 409 },
      );
    }

    // Lazy Stripe Customer provisioning, race-safe:
    //  1. the unique userId index makes the row upsert atomic,
    //  2. the Stripe idempotency key makes concurrent customers.create calls return the
    //     same customer,
    //  3. the conditional update only lets one writer set stripeCustomerId.
    let stripeCustomerId = existing?.stripeCustomerId;
    if (!stripeCustomerId) {
      await Subscription.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, tier: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false } },
        { upsert: true, new: true },
      );
      const user = await User.findById(userId).lean();
      const customer = await stripe.customers.create(
        {
          ...(user?.email ? { email: user.email } : {}),
          metadata: { userId },
        },
        { idempotencyKey: `customer-create-${userId}` },
      );
      const claimed = await Subscription.findOneAndUpdate(
        { userId, stripeCustomerId: { $exists: false } },
        { $set: { stripeCustomerId: customer.id } },
        { new: true },
      );
      stripeCustomerId = claimed
        ? customer.id
        : (await Subscription.findOne({ userId }))?.stripeCustomerId ?? customer.id;
    }

    const appUrl = getAppUrl();
    const tier = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'PRO' : 'TEAM';
    const attributionMetadata = twclid ? { xTwclid: twclid } : {};

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing`,
      metadata: { userId, tier, ...attributionMetadata },
      subscription_data: { metadata: { userId, tier, ...attributionMetadata } },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    return serializeError(err);
  }
}
