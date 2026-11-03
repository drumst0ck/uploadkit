import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  Subscription: {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(() => ({ lean: () => Promise.resolve(null) })),
  },
  StripeEvent: {
    create: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    deleteOne: vi.fn().mockResolvedValue({}),
  },
  // Deliberately absent: File / Project. Downgrade must never touch user data.
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn(), cancel: vi.fn() },
    customers: { retrieve: vi.fn().mockResolvedValue({ deleted: true }) },
  },
}));
vi.mock('@uploadkitdev/emails', () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/x-conversions', () => ({ sendXPurchaseConversion: vi.fn().mockResolvedValue(true) }));

import { POST } from '@/app/api/v1/webhooks/stripe/route';
import { Subscription } from '@uploadkitdev/db';
import { stripe } from '@/lib/stripe';
import { sendInvoiceEmail } from '@uploadkitdev/emails';
import { sendXPurchaseConversion } from '@/lib/x-conversions';

let seq = 0;
async function send(type: string, object: object) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
    id: `evt_td_${++seq}`,
    type,
    data: { object },
  } as never);
  const res = await POST(
    new NextRequest('http://localhost/api/v1/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: '{}',
    }),
  );
  expect(res.status).toBe(200);
}

const now = Math.floor(Date.now() / 1000);
const stripeSub = (status: string, price: string) => ({
  id: 'sub_1',
  status,
  cancel_at_period_end: false,
  items: { data: [{ price: { id: price }, current_period_start: now, current_period_end: now + 86400 }] },
});

function lastSet() {
  const calls = vi.mocked(Subscription.findOneAndUpdate).mock.calls;
  return (calls[calls.length - 1]![1] as { $set: Record<string, unknown>; $unset?: object }).$set;
}

describe('trial start via checkout.session.completed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Subscription.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(Subscription.findOne).mockReturnValue({ lean: () => Promise.resolve(null) } as never);
  });

  for (const [label, price] of [
    ['monthly', 'price_pro_fake'],
    ['yearly', 'price_pro_yearly_fake'],
  ] as const) {
    it(`Pro ${label} trialing: PRO + TRIALING and trialUsedAt recorded`, async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(stripeSub('trialing', price) as never);
      await send('checkout.session.completed', { customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'u1' } });
      expect(lastSet()).toMatchObject({ tier: 'PRO', status: 'TRIALING', stripePriceId: price });
      expect(lastSet().trialUsedAt).toBeInstanceOf(Date);
    });
  }

  it('Team yearly active checkout: TEAM + ACTIVE, no trial', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(stripeSub('active', 'price_team_yearly_fake') as never);
    await send('checkout.session.completed', { customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'u1' } });
    expect(lastSet()).toMatchObject({ tier: 'TEAM', status: 'ACTIVE', stripePriceId: 'price_team_yearly_fake' });
  });

  it('non-trial active checkout: ACTIVE, still records trialUsedAt so no later trial is offered', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(stripeSub('active', 'price_team_fake') as never);
    await send('checkout.session.completed', { customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'u1' } });
    expect(lastSet()).toMatchObject({ tier: 'TEAM', status: 'ACTIVE' });
    expect(lastSet().trialUsedAt).toBeInstanceOf(Date);
  });

  it('keeps the original trialUsedAt when already set', async () => {
    const original = new Date('2026-01-01T00:00:00Z');
    vi.mocked(Subscription.findOne).mockReturnValue({
      lean: () => Promise.resolve({ trialUsedAt: original }),
    } as never);
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(stripeSub('active', 'price_pro_fake') as never);
    await send('checkout.session.completed', { customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'u1' } });
    expect(lastSet().trialUsedAt).toEqual(original);
  });
});

describe('subscription lifecycle after trial and during dunning (S6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Subscription.findOneAndUpdate).mockResolvedValue({} as never);
  });

  const cases: [string, string, string, string][] = [
    ['yearly price maps to PRO', 'active', 'ACTIVE', 'PRO'],
    ['trial running keeps PRO', 'trialing', 'TRIALING', 'PRO'],
    ['first charge after trial fails: retries in progress keep PRO', 'past_due', 'PAST_DUE', 'PRO'],
    ['retries exhausted (unpaid) moves to FREE', 'unpaid', 'PAST_DUE', 'FREE'],
    ['retries exhausted (canceled) moves to FREE', 'canceled', 'CANCELED', 'FREE'],
    ['trial ended with no payment method (incomplete) gives no paid access', 'incomplete', 'PAST_DUE', 'FREE'],
    ['incomplete_expired gives no paid access', 'incomplete_expired', 'CANCELED', 'FREE'],
  ];
  for (const [label, stripeStatus, status, tier] of cases) {
    it(label, async () => {
      await send('customer.subscription.updated', stripeSub(stripeStatus, 'price_pro_yearly_fake'));
      expect(lastSet()).toMatchObject({ tier, status });
    });
  }

  it('past_due then paid recovers to ACTIVE without touching tier', async () => {
    await send('invoice.paid', { customer: 'cus_1', amount_paid: 1500, created: now, status_transitions: {} });
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_1', status: 'PAST_DUE' },
      { $set: { status: 'ACTIVE' } },
    );
  });

  it('a $0 trial-start invoice sends no payment-received email; a real charge does', async () => {
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ deleted: false, email: 'a@b.co', name: 'A' } as never);
    await send('invoice.paid', { customer: 'cus_1', amount_paid: 0, created: now, status_transitions: {} });
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    await send('invoice.paid', { customer: 'cus_1', amount_paid: 1500, created: now, status_transitions: {} });
    expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendInvoiceEmail).mock.calls[0]![1]).toMatchObject({ type: 'paid', amount: '$15.00' });
  });

  it('invoice.payment_failed only flags PAST_DUE (tier untouched during retries)', async () => {
    await send('invoice.payment_failed', { customer: 'cus_1', amount_due: 1500, created: now });
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_1' },
      { $set: { status: 'PAST_DUE' } },
    );
  });

  it('subscription.deleted downgrades to FREE and only touches subscription fields (data retained)', async () => {
    await send('customer.subscription.deleted', stripeSub('canceled', 'price_pro_yearly_fake'));
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeSubscriptionId: 'sub_1' },
      {
        $set: { tier: 'FREE', status: 'CANCELED', cancelAtPeriodEnd: false },
        $unset: { stripeSubscriptionId: '', stripePriceId: '' },
      },
    );
  });
});

describe('X purchase conversion after a Pro trial (T15)', () => {
  const CLAIM_FILTER = { stripeSubscriptionId: 'sub_1', firstPaidAt: { $exists: false } };
  const invoice = (over: Record<string, unknown> = {}) => ({
    id: 'in_cycle1',
    customer: 'cus_1',
    amount_paid: 1500,
    currency: 'usd',
    created: now,
    billing_reason: 'subscription_cycle',
    status_transitions: { paid_at: now },
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: 'sub_1', metadata: { userId: 'u1', tier: 'PRO', xTwclid: 'tw1' } },
    },
    ...over,
  });
  const unconverted = () =>
    vi.mocked(Subscription.findOne).mockReturnValue({ lean: () => Promise.resolve({ stripeSubscriptionId: 'sub_1' }) } as never);
  const claims = () =>
    vi.mocked(Subscription.findOneAndUpdate).mock.calls.filter(
      (c) => (c[1] as { $set?: Record<string, unknown> }).$set?.['firstPaidAt'] !== undefined,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Subscription.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ deleted: false, email: 'a@b.co', name: 'A' } as never);
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({ id: 'sub_1', trial_start: now - 100, trial_end: now - 1 } as never);
    unconverted();
  });

  it('first paid cycle invoice of a trial subscription sends the conversion and records firstPaidAt atomically', async () => {
    await send('invoice.paid', invoice());
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    expect(claims()).toHaveLength(1);
    expect(claims()[0]![0]).toEqual(CLAIM_FILTER);
    expect((claims()[0]![1] as { $set: { firstPaidAt: unknown } }).$set.firstPaidAt).toEqual(new Date(now * 1000));
    expect(sendXPurchaseConversion).toHaveBeenCalledTimes(1);
    expect(sendXPurchaseConversion).toHaveBeenCalledWith({
      conversionId: 'in_cycle1',
      conversionTime: new Date(now * 1000).toISOString(),
      currency: 'usd',
      value: 15,
      email: 'a@b.co',
      twclid: 'tw1',
      plan: 'PRO',
    });
  });

  it('later renewals (firstPaidAt already recorded) do not fire and do not call Stripe', async () => {
    vi.mocked(Subscription.findOne).mockReturnValue({ lean: () => Promise.resolve(null) } as never);
    await send('invoice.paid', invoice({ id: 'in_cycle2' }));
    expect(sendXPurchaseConversion).not.toHaveBeenCalled();
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it('losing the atomic claim (concurrent delivery) does not send', async () => {
    vi.mocked(Subscription.findOneAndUpdate).mockImplementation(((f: object) =>
      Promise.resolve('firstPaidAt' in f ? null : {})) as never);
    await send('invoice.paid', invoice());
    expect(sendXPurchaseConversion).not.toHaveBeenCalled();
  });

  it('a subscription that never trialed gets firstPaidAt recorded but no conversion from a renewal', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({ id: 'sub_1', trial_start: null, trial_end: null } as never);
    await send('invoice.paid', invoice());
    expect(sendXPurchaseConversion).not.toHaveBeenCalled();
    expect(claims()).toHaveLength(1);
  });

  it('a $0 cycle invoice never converts', async () => {
    await send('invoice.paid', invoice({ amount_paid: 0 }));
    expect(sendXPurchaseConversion).not.toHaveBeenCalled();
    expect(claims()).toHaveLength(0);
  });

  it('non-trial purchase (subscription_create, paid) keeps firing and records firstPaidAt', async () => {
    await send('invoice.paid', invoice({ id: 'in_create', billing_reason: 'subscription_create' }));
    expect(sendXPurchaseConversion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendXPurchaseConversion).mock.calls[0]![0]).toMatchObject({ conversionId: 'in_create', value: 15 });
    expect(claims()).toHaveLength(1);
  });

  it('release of the claim when sending throws, so the Stripe retry can send', async () => {
    vi.mocked(sendXPurchaseConversion).mockRejectedValueOnce(new Error('x down'));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({ id: 'evt_td_fail', type: 'invoice.paid', data: { object: invoice() } } as never);
    const res = await POST(
      new NextRequest('http://localhost/api/v1/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' }),
    );
    expect(res.status).toBe(500);
    expect(Subscription.findOneAndUpdate).toHaveBeenLastCalledWith(
      { stripeSubscriptionId: 'sub_1' },
      { $unset: { firstPaidAt: '' } },
    );
  });
});

describe('stale unpaid subscription replaced via checkout.session.completed (T16)', () => {
  const session = { customer: 'cus_1', subscription: 'sub_new', metadata: { userId: 'u1' } };
  const newSub = { ...stripeSub('active', 'price_pro_fake'), id: 'sub_new' };
  const current = (over: object) =>
    vi.mocked(Subscription.findOne).mockReturnValue({
      lean: () => Promise.resolve({ stripeSubscriptionId: 'sub_old', tier: 'FREE', status: 'PAST_DUE', ...over }),
    } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Subscription.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as never);
    vi.mocked(stripe.subscriptions.retrieve).mockImplementation((async (id: string) =>
      id === 'sub_new' ? newSub : { id, status: 'unpaid' }) as never);
  });

  it('stores the new subscription and cancels the old unpaid one', async () => {
    current({});
    await send('checkout.session.completed', session);
    expect(lastSet()).toMatchObject({ stripeSubscriptionId: 'sub_new', tier: 'PRO', status: 'ACTIVE' });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
  });

  it('a failed cancel is logged and does not lose the new subscription (event still succeeds)', async () => {
    current({});
    vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error('stripe down'));
    await send('checkout.session.completed', session);
    expect(lastSet()).toMatchObject({ stripeSubscriptionId: 'sub_new' });
  });

  it('same subscription id: nothing canceled', async () => {
    current({ stripeSubscriptionId: 'sub_new' });
    await send('checkout.session.completed', session);
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it('live old subscription: the NEW duplicate is canceled, old is untouched', async () => {
    current({ tier: 'PRO', status: 'ACTIVE' });
    await send('checkout.session.completed', session);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_new');
  });

  it('old past_due subscription of a paid tier is canceled once the new one is saved', async () => {
    current({ tier: 'PRO', status: 'PAST_DUE' });
    vi.mocked(stripe.subscriptions.retrieve).mockImplementation((async (id: string) =>
      id === 'sub_new' ? newSub : { id, status: 'past_due' }) as never);
    await send('checkout.session.completed', session);
    expect(lastSet()).toMatchObject({ stripeSubscriptionId: 'sub_new', tier: 'PRO', status: 'ACTIVE' });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
  });

  it('old subscription that Stripe reports as active again is not canceled', async () => {
    current({ tier: 'PRO', status: 'PAST_DUE' });
    vi.mocked(stripe.subscriptions.retrieve).mockImplementation((async (id: string) =>
      id === 'sub_new' ? newSub : { id, status: 'active' }) as never);
    await send('checkout.session.completed', session);
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalledWith('sub_old');
  });
});
