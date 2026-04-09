import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, Subscription, User } from '@uploadkitdev/db';
import { stripe } from '../../../../../lib/stripe';
import { serializeError, serializeValidationError } from '../../../../../lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  userId: z.string().min(1),
  priceId: z.string().min(1),
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
    // Internal route protection: require X-Internal-Secret header
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      const providedSecret = req.headers.get('x-internal-secret');
      if (providedSecret !== internalSecret) {
        return NextResponse.json(
          { error: { type: 'authentication_error', code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          { status: 401 },
        );
      }
    }

    const body: unknown = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return serializeValidationError(parsed.error);
    }
    const { userId, priceId } = parsed.data;

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

    // Lazy Stripe Customer provisioning: create customer if none exists
    const subscription = await Subscription.findOne({ userId });
    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Look up user email for customer creation
      const user = await User.findById(userId).lean();
      const customer = await stripe.customers.create({
        ...(user?.email ? { email: user.email } : {}),
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      if (subscription) {
        subscription.stripeCustomerId = stripeCustomerId;
        await subscription.save();
      } else {
        await Subscription.create({
          userId,
          stripeCustomerId,
          tier: 'FREE',
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
        });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    return serializeError(err);
  }
}
