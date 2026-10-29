import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  Subscription: { findOneAndUpdate: vi.fn(), findOne: vi.fn() },
  StripeEvent: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@uploadkitdev/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined), ...db }));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn(), cancel: vi.fn() },
    customers: { retrieve: vi.fn() },
  },
}));
vi.mock('@uploadkitdev/emails', () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/x-conversions', () => ({ sendXPurchaseConversion: vi.fn().mockResolvedValue(true) }));

import { POST } from '@/app/api/v1/webhooks/stripe/route';
import { stripe } from '@/lib/stripe';
import { sendInvoiceEmail } from '@uploadkitdev/emails';

const req = () =>
  new NextRequest('http://localhost/api/v1/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 's' },
    body: '{}',
  });

const item = (price: string) => ({
  price: { id: price },
  current_period_start: 1_700_000_000,
  current_period_end: 1_702_000_000,
});

function subUpdated(status: string, price = process.env.STRIPE_PRO_PRICE_ID!) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
    id: 'evt_1',
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_1', status, cancel_at_period_end: false, items: { data: [item(price)] } } },
  } as any);
}

describe('stripe webhook hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.Subscription.findOneAndUpdate.mockResolvedValue({});
    db.Subscription.findOne.mockResolvedValue(null);
    db.StripeEvent.create.mockResolvedValue({});
    db.StripeEvent.updateOne.mockResolvedValue({});
    db.StripeEvent.deleteOne.mockResolvedValue({});
  });

  describe('status mapping', () => {
    const cases: Array<[string, string, string]> = [
      ['active', 'ACTIVE', 'PRO'],
      ['trialing', 'TRIALING', 'PRO'],
      ['past_due', 'PAST_DUE', 'PRO'], // dunning grace: keeps access
      ['unpaid', 'PAST_DUE', 'FREE'],
      ['incomplete', 'PAST_DUE', 'FREE'],
      ['paused', 'PAST_DUE', 'FREE'],
      ['incomplete_expired', 'CANCELED', 'FREE'],
      ['canceled', 'CANCELED', 'FREE'],
      ['something_new', 'PAST_DUE', 'FREE'],
    ];
    for (const [stripeStatus, status, tier] of cases) {
      it(`${stripeStatus} -> ${status}/${tier}`, async () => {
        subUpdated(stripeStatus);
        const res = await POST(req());
        expect(res.status).toBe(200);
        expect(db.Subscription.findOneAndUpdate).toHaveBeenCalledWith(
          { stripeSubscriptionId: 'sub_1' },
          expect.objectContaining({ $set: expect.objectContaining({ status, tier }) }),
        );
      });
    }
  });

  describe('idempotency', () => {
    it('skips a duplicate already-processed event without re-running side effects', async () => {
      subUpdated('active');
      db.StripeEvent.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
      db.StripeEvent.findOne.mockReturnValue({ lean: () => Promise.resolve({ status: 'done' }) });
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect((await res.json()).duplicate).toBe(true);
      expect(db.Subscription.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns 409 when the same event is still being processed', async () => {
      subUpdated('active');
      db.StripeEvent.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
      db.StripeEvent.findOne.mockReturnValue({ lean: () => Promise.resolve({ status: 'processing' }) });
      db.StripeEvent.findOneAndUpdate.mockResolvedValue(null); // lock not stale
      const res = await POST(req());
      expect(res.status).toBe(409);
      expect(db.Subscription.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('marks the event done after success', async () => {
      subUpdated('active');
      await POST(req());
      expect(db.StripeEvent.updateOne).toHaveBeenCalledWith(
        { eventId: 'evt_1' },
        { $set: { status: 'done' } },
      );
    });

    it('does not email twice for a redelivered invoice.paid', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_inv',
        type: 'invoice.paid',
        data: { object: { id: 'in_1', customer: 'cus_1', amount_paid: 100, created: 1, billing_reason: 'subscription_cycle', status_transitions: {} } },
      } as any);
      vi.mocked(stripe.customers.retrieve).mockResolvedValue({ deleted: false, email: 'a@b.co', name: 'A' } as any);
      await POST(req());
      db.StripeEvent.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
      db.StripeEvent.findOne.mockReturnValue({ lean: () => Promise.resolve({ status: 'done' }) });
      await POST(req());
      expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('handler errors', () => {
    it('returns 500 and releases the claim so Stripe retries', async () => {
      subUpdated('active');
      db.Subscription.findOneAndUpdate.mockRejectedValue(new Error('mongo down'));
      const res = await POST(req());
      expect(res.status).toBe(500);
      expect(db.StripeEvent.deleteOne).toHaveBeenCalledWith({ eventId: 'evt_1' });
    });
  });

  describe('duplicate subscriptions', () => {
    it('cancels a second checkout subscription instead of overwriting the live one', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_c',
        type: 'checkout.session.completed',
        data: { object: { subscription: 'sub_new', customer: 'cus_1', metadata: { userId: 'u1' } } },
      } as any);
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_new', status: 'active', cancel_at_period_end: false,
        items: { data: [item(process.env.STRIPE_PRO_PRICE_ID!)] },
      } as any);
      db.Subscription.findOne.mockReturnValue({
        lean: () => Promise.resolve({ stripeSubscriptionId: 'sub_old', status: 'ACTIVE', tier: 'PRO' }),
      });
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_new');
      expect(db.Subscription.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });
});
