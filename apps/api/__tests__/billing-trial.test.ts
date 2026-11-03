import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const sub = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  Subscription: sub,
  User: { findById: vi.fn(() => ({ lean: () => Promise.resolve({ email: 'a@b.co' }) })) },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_new' }) },
    subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe/checkout' }) } },
  },
}));

import { POST as checkout } from '@/app/api/v1/billing/checkout/route';
import { stripe } from '@/lib/stripe';

const USER = '507f1f77bcf86cd799439011';
const TRIAL = {
  trial_period_days: 14,
  trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
};

function post(priceId: string) {
  return checkout(
    new NextRequest('http://localhost/api/v1/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': 'internal-secret' },
      body: JSON.stringify({ userId: USER, priceId }),
    }),
  );
}

function createdParams() {
  return vi.mocked(stripe.checkout.sessions.create).mock.calls[0]![0] as Record<string, any>;
}

describe('checkout trial (Pro monthly/yearly: 14 days with card, Team: none)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'internal-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', tier: 'FREE', status: 'ACTIVE' });
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [] } as never);
  });

  for (const [label, priceId] of [
    ['monthly', 'price_pro_fake'],
    ['yearly', 'price_pro_yearly_fake'],
  ] as const) {
    it(`Pro ${label}: 14-day trial, card always required`, async () => {
      const res = await post(priceId);
      expect(res.status).toBe(200);
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer: 'cus_1',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: 'https://app.example.com/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://app.example.com/dashboard/billing',
        payment_method_collection: 'always',
        metadata: { userId: USER, tier: 'PRO' },
        subscription_data: { metadata: { userId: USER, tier: 'PRO' }, ...TRIAL },
      });
    });
  }

  it('Team: no trial and no forced collection param', async () => {
    await post('price_team_fake');
    const p = createdParams();
    expect(p.subscription_data).toEqual({ metadata: { userId: USER, tier: 'TEAM' } });
    expect(p.payment_method_collection).toBeUndefined();
  });

  it('Pro: no trial when the user already used one (trialUsedAt)', async () => {
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', tier: 'FREE', status: 'ACTIVE', trialUsedAt: new Date() });
    await post('price_pro_fake');
    const p = createdParams();
    expect(p.subscription_data).toEqual({ metadata: { userId: USER, tier: 'PRO' } });
    expect(p.payment_method_collection).toBe('always');
  });

  it('Pro: no trial after a previous paid subscription was canceled (legacy user without flag)', async () => {
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', tier: 'FREE', status: 'CANCELED' });
    await post('price_pro_yearly_fake');
    expect(createdParams().subscription_data).toEqual({ metadata: { userId: USER, tier: 'PRO' } });
  });

  it('Pro: no trial when the Stripe customer has any past subscription', async () => {
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [{ id: 'sub_old' }] } as never);
    await post('price_pro_fake');
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({ customer: 'cus_1', status: 'all', limit: 1 });
    expect(createdParams().subscription_data).toEqual({ metadata: { userId: USER, tier: 'PRO' } });
  });

  it('rejects unknown price ids', async () => {
    expect((await post('price_other')).status).toBe(400);
  });
});
