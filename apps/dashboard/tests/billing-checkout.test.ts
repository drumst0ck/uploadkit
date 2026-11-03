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
    subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
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
