import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, Subscription } from '@uploadkitdev/db';
import { stripe } from '../../../../../lib/stripe';
import { serializeError, serializeValidationError } from '../../../../../lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  userId: z.string().min(1),
});

/**
 * POST /api/v1/billing/portal
 *
 * Creates a Stripe Billing Portal session for subscription management.
 * Called from the dashboard server actions — protected by internal secret header.
 *
 * Security (T-07-03):
 *   - stripeCustomerId looked up from DB by authenticated userId — never accepted from client
 *   - Per BILL-02: Portal allows plan changes, cancellation, payment method updates
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
    const { userId } = parsed.data;

    await connectDB();

    // T-07-03: Look up stripeCustomerId from DB — never accept from client
    const subscription = await Subscription.findOne({ userId }).lean();
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'NO_CUSTOMER', message: 'No billing account found for this user' } },
        { status: 404 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err) {
    return serializeError(err);
  }
}
