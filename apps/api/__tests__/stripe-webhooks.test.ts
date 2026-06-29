import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  Subscription: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    customers: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock('@uploadkitdev/emails', () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/x-conversions', () => ({
  sendXPurchaseConversion: vi.fn().mockResolvedValue(true),
}));

import { POST } from '@/app/api/v1/webhooks/stripe/route';
import { Subscription } from '@uploadkitdev/db';
import { stripe } from '@/lib/stripe';
import { sendXPurchaseConversion } from '@/lib/x-conversions';

function makeWebhookRequest(body: string, signature: string = 'test-sig'): NextRequest {
  return new NextRequest('http://localhost/api/v1/webhooks/stripe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body,
  });
}

function makeStripeEvent(type: string, data: object) {
  return { type, data: { object: data } };
}

describe('POST /api/v1/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Subscription.findOneAndUpdate).mockResolvedValue({} as any);
  });

  it('returns 400 on invalid webhook signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = makeWebhookRequest('{}', 'bad-sig');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing stripe-signature header');
  });

  it('checkout.session.completed updates user tier and creates Subscription', async () => {
    const fakeSub = {
      id: 'sub_123',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [{
          price: { id: process.env.STRIPE_PRO_PRICE_ID },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }],
      },
    };

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('checkout.session.completed', {
        subscription: 'sub_123',
        customer: 'cus_abc',
        metadata: { userId: 'user-upgrade' },
      }) as any,
    );
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(fakeSub as any);

    const req = makeWebhookRequest(JSON.stringify({ type: 'checkout.session.completed' }));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-upgrade' },
      expect.objectContaining({
        $set: expect.objectContaining({
          tier: 'PRO',
          status: 'ACTIVE',
          stripeCustomerId: 'cus_abc',
        }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('customer.subscription.updated syncs plan changes', async () => {
    const updatedSub = {
      id: 'sub_456',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [{
          price: { id: process.env.STRIPE_TEAM_PRICE_ID },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }],
      },
    };

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('customer.subscription.updated', updatedSub) as any,
    );

    const req = makeWebhookRequest(JSON.stringify({ type: 'customer.subscription.updated' }));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeSubscriptionId: 'sub_456' },
      expect.objectContaining({
        $set: expect.objectContaining({ tier: 'TEAM', status: 'ACTIVE' }),
      }),
    );
  });

  it('customer.subscription.deleted downgrades to FREE', async () => {
    const deletedSub = {
      id: 'sub_789',
      status: 'canceled',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_pro' } }] },
    };

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('customer.subscription.deleted', deletedSub) as any,
    );

    const req = makeWebhookRequest(JSON.stringify({ type: 'customer.subscription.deleted' }));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeSubscriptionId: 'sub_789' },
      expect.objectContaining({
        $set: expect.objectContaining({ tier: 'FREE', status: 'CANCELED' }),
        $unset: expect.objectContaining({ stripeSubscriptionId: '' }),
      }),
    );
  });

  it('invoice.paid sends an initial subscription purchase to X', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('invoice.paid', {
        id: 'in_initial',
        customer: 'cus_buyer',
        amount_paid: 1500,
        currency: 'usd',
        created: 1_782_729_600,
        billing_reason: 'subscription_create',
        status_transitions: { paid_at: 1_782_729_610 },
        parent: {
          type: 'subscription_details',
          subscription_details: {
            metadata: {
              userId: 'user-buyer',
              tier: 'PRO',
              xTwclid: 'x-click-123',
            },
          },
        },
      }) as any,
    );
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({
      id: 'cus_buyer',
      deleted: false,
      email: 'buyer@example.com',
      name: 'Buyer',
    } as any);

    const res = await POST(makeWebhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(sendXPurchaseConversion).toHaveBeenCalledWith({
      conversionId: 'in_initial',
      conversionTime: '2026-06-29T10:40:10.000Z',
      currency: 'usd',
      email: 'buyer@example.com',
      plan: 'PRO',
      twclid: 'x-click-123',
      value: 15,
    });
  });

  it('invoice.paid does not count subscription renewals as acquisitions', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('invoice.paid', {
        id: 'in_renewal',
        customer: 'cus_buyer',
        amount_paid: 1500,
        currency: 'usd',
        created: 1_782_729_600,
        billing_reason: 'subscription_cycle',
        status_transitions: { paid_at: 1_782_729_610 },
      }) as any,
    );
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({
      id: 'cus_buyer',
      deleted: false,
      email: 'buyer@example.com',
      name: 'Buyer',
    } as any);

    const res = await POST(makeWebhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(sendXPurchaseConversion).not.toHaveBeenCalled();
  });
});
