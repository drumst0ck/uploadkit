'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '../../../../auth';
import { connectDB, Subscription, User } from '@uploadkitdev/db';
import { stripe } from '../../../lib/stripe';
import { getAppUrl } from '../../../lib/app-url';

const X_CLICK_ID_PATTERN = /^[A-Za-z0-9._-]{1,256}$/;

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

  const cookieStore = await cookies();
  const cookieTwclid = cookieStore.get('uk_twclid')?.value;
  const twclid =
    cookieTwclid && X_CLICK_ID_PATTERN.test(cookieTwclid) ? cookieTwclid : undefined;

  // T-07-02: Validate priceId against known values
  const validPriceIds = [
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_TEAM_PRICE_ID,
  ].filter(Boolean);

  if (!validPriceIds.includes(priceId)) {
    throw new Error('Invalid price ID');
  }

  await connectDB();

  const appUrl = getAppUrl();
  const existing = await Subscription.findOne({ userId });

  // Already subscribed (ACTIVE/TRIALING): never create a second subscription —
  // send the user to the Billing Portal to change plan or payment method.
  if (
    existing?.stripeCustomerId &&
    existing.stripeSubscriptionId &&
    (existing.status === 'ACTIVE' || existing.status === 'TRIALING') &&
    existing.tier !== 'FREE'
  ) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });
    redirect(portal.url);
  }

  // Lazy Stripe Customer provisioning, race-safe (double click / two tabs):
  // atomic row upsert (unique userId), Stripe idempotency key, conditional claim.
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

  const tier = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'PRO' : 'TEAM';
  const attributionMetadata = twclid ? { xTwclid: twclid } : {};

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { userId, tier, ...attributionMetadata },
    subscription_data: { metadata: { userId, tier, ...attributionMetadata } },
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
export async function createPortalSession(): Promise<{ url: string }> {
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

  const appUrl = getAppUrl();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return { url: portalSession.url };
}
