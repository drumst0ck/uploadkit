'use server';

import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB, Subscription, User } from '@uploadkit/db';
import { stripe } from '../../../lib/stripe';

/**
 * Creates a Stripe Checkout Session and redirects the user to it.
 *
 * Security (T-07-01, T-07-02):
 *   - userId sourced from authenticated session — never from client input
 *   - priceId validated against known env var values server-side
 */
export async function createCheckoutSession(priceId: string): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const userId = session.user.id;

  // T-07-02: Validate priceId against known values
  const validPriceIds = [
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_TEAM_PRICE_ID,
  ].filter(Boolean);

  if (!validPriceIds.includes(priceId)) {
    throw new Error('Invalid price ID');
  }

  await connectDB();

  // Lazy Stripe Customer provisioning
  const subscription = await Subscription.findOne({ userId });
  let stripeCustomerId = subscription?.stripeCustomerId;

  if (!stripeCustomerId) {
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

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  if (!checkoutSession.url) {
    throw new Error('Failed to create Checkout session');
  }

  redirect(checkoutSession.url);
}

/**
 * Creates a Stripe Billing Portal session and redirects the user to it.
 *
 * Security (T-07-03):
 *   - stripeCustomerId looked up from DB by authenticated session userId — never from client
 */
export async function createPortalSession(): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const userId = session.user.id;

  await connectDB();

  // T-07-03: Look up stripeCustomerId from DB — never accept from client
  const subscription = await Subscription.findOne({ userId }).lean();
  if (!subscription?.stripeCustomerId) {
    throw new Error('No billing account found. Please upgrade to a paid plan first.');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  redirect(portalSession.url);
}
