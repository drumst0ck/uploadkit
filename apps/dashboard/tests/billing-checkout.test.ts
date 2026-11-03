import { describe, it, expect, vi, beforeEach } from 'vitest';

const sub = vi.hoisted(() => ({ findOne: vi.fn(), findOneAndUpdate: vi.fn() }));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: () => undefined }),
}));
vi.mock('../auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'user_1' } }) }));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  Subscription: sub,
  User: { findById: vi.fn(() => ({ lean: () => Promise.resolve({ email: 'a@b.co' }) })) },
}));
vi.mock('../src/lib/stripe', () => ({
  stripe: {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_new' }) },
    subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }), retrieve: vi.fn(), cancel: vi.fn().mockResolvedValue({}) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe/checkout' }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe/portal' }) } },
  },
}));

import { createCheckoutSession } from '../src/app/dashboard/billing/actions';
import { stripe } from '../src/lib/stripe';

const TRIAL = {
  trial_period_days: 14,
  trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
};

async function run(priceId: string) {
  await expect(createCheckoutSession(priceId)).rejects.toThrow('NEXT_REDIRECT:https://stripe/checkout');
  return vi.mocked(stripe.checkout.sessions.create).mock.calls[0]![0] as Record<string, any>;
}

describe('dashboard createCheckoutSession trial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
    process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_pro_yearly';
    process.env.STRIPE_TEAM_PRICE_ID = 'price_team';
    process.env.STRIPE_TEAM_YEARLY_PRICE_ID = 'price_team_yearly';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', tier: 'FREE', status: 'ACTIVE' });
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [] } as never);
  });

  for (const [label, priceId] of [
    ['monthly', 'price_pro'],
    ['yearly', 'price_pro_yearly'],
  ] as const) {
    it(`Pro ${label}: exact params with 14-day trial and card always required`, async () => {
      const params = await run(priceId);
      expect(params).toEqual({
        mode: 'subscription',
        customer: 'cus_1',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: 'https://app.example.com/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://app.example.com/dashboard/billing',
        payment_method_collection: 'always',
        metadata: { userId: 'user_1', tier: 'PRO' },
        subscription_data: { metadata: { userId: 'user_1', tier: 'PRO' }, ...TRIAL },
      });
    });
  }

  it('Team: no trial', async () => {
    const params = await run('price_team');
    expect(params.subscription_data).toEqual({ metadata: { userId: 'user_1', tier: 'TEAM' } });
    expect(params.payment_method_collection).toBeUndefined();
  });

  it('Team yearly: accepted, no trial', async () => {
    const params = await run('price_team_yearly');
    expect(params.line_items).toEqual([{ price: 'price_team_yearly', quantity: 1 }]);
    expect(params.subscription_data).toEqual({ metadata: { userId: 'user_1', tier: 'TEAM' } });
    expect(params.payment_method_collection).toBeUndefined();
  });

  it('Pro: no trial once trialUsedAt is set', async () => {
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', tier: 'FREE', status: 'ACTIVE', trialUsedAt: new Date() });
    const params = await run('price_pro_yearly');
    expect(params.subscription_data).toEqual({ metadata: { userId: 'user_1', tier: 'PRO' } });
    expect(params.payment_method_collection).toBe('always');
  });

  it('Pro: no trial when the Stripe customer already had a subscription', async () => {
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [{ id: 'sub_old' }] } as never);
    const params = await run('price_pro');
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({ customer: 'cus_1', status: 'all', limit: 1 });
    expect(params.subscription_data).toEqual({ metadata: { userId: 'user_1', tier: 'PRO' } });
  });

  it('rejects unknown price ids', async () => {
    await expect(createCheckoutSession('price_x')).rejects.toThrow('Invalid price ID');
  });
});

describe('dashboard stale unpaid subscription cleanup (T16)', () => {
  const stale = { stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_old', tier: 'FREE', status: 'PAST_DUE' };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [{ id: 'sub_old' }] } as never);
    vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as never);
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({ status: 'unpaid' } as never);
  });

  it('cancels the old unpaid subscription before creating the new checkout', async () => {
    sub.findOne.mockResolvedValue(stale);
    await run('price_pro');
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_old');
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
    expect(vi.mocked(stripe.subscriptions.cancel).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(stripe.checkout.sessions.create).mock.invocationCallOrder[0]!,
    );
  });

  it('a cancel failure does not block checkout', async () => {
    sub.findOne.mockResolvedValue(stale);
    vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error('stripe down'));
    await run('price_pro');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('active subscription: sent to the portal, nothing canceled, no new checkout', async () => {
    sub.findOne.mockResolvedValue({ ...stale, tier: 'PRO', status: 'ACTIVE' });
    await expect(createCheckoutSession('price_pro')).rejects.toThrow('NEXT_REDIRECT:https://stripe/portal');
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('past_due with paid access is not canceled', async () => {
    sub.findOne.mockResolvedValue({ ...stale, tier: 'PRO' });
    await run('price_pro');
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });
});
