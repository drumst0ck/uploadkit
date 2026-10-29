import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe/checkout' }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe/portal' }) } },
  },
}));

import { POST as portal } from '@/app/api/v1/billing/portal/route';
import { POST as checkout } from '@/app/api/v1/billing/checkout/route';
import { stripe } from '@/lib/stripe';

const USER = '507f1f77bcf86cd799439011';

function req(path: string, body: object, secret?: string) {
  return new NextRequest(`http://localhost/api/v1/billing/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret ? { 'x-internal-secret': secret } : {}) },
    body: JSON.stringify(body),
  });
}

describe('internal billing routes', () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'internal-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    sub.findOne.mockReturnValue({ lean: () => Promise.resolve({ stripeCustomerId: 'cus_1' }) });
  });
  afterEach(() => {
    process.env = { ...env };
  });

  for (const [name, route, path, body] of [
    ['portal', portal, 'portal', { userId: USER }],
    ['checkout', checkout, 'checkout', { userId: USER, priceId: 'price_pro_fake' }],
  ] as const) {
    it(`${name}: fails closed with 503 when INTERNAL_API_SECRET is missing`, async () => {
      delete process.env.INTERNAL_API_SECRET;
      const res = await route(req(path, body));
      expect(res.status).toBe(503);
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it(`${name}: 401 on wrong or absent secret`, async () => {
      expect((await route(req(path, body, 'nope'))).status).toBe(401);
      expect((await route(req(path, body))).status).toBe(401);
    });
  }

  it('portal: authorized request returns the portal url using the configured app url', async () => {
    const res = await portal(req('portal', { userId: USER }, 'internal-secret'));
    expect(res.status).toBe(200);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://app.example.com/dashboard/billing',
    });
  });

  it('portal: rejects a userId that is not an ObjectId', async () => {
    const res = await portal(req('portal', { userId: 'abc' }, 'internal-secret'));
    expect(res.status).toBe(400);
  });

  it('checkout: refuses with 409 when the user already has a live subscription', async () => {
    sub.findOne.mockResolvedValue({
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      status: 'ACTIVE',
      tier: 'PRO',
    });
    const res = await checkout(req('checkout', { userId: USER, priceId: 'price_team_fake' }, 'internal-secret'));
    expect(res.status).toBe(409);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('checkout: creates the customer with a stable idempotency key and an atomic claim', async () => {
    sub.findOne.mockResolvedValue(null);
    // upsert of the (empty) subscription row, then atomic stripeCustomerId set
    sub.findOneAndUpdate
      .mockResolvedValueOnce({ userId: USER })
      .mockResolvedValueOnce({ userId: USER, stripeCustomerId: 'cus_new' });
    const res = await checkout(req('checkout', { userId: USER, priceId: 'price_pro_fake' }, 'internal-secret'));
    expect(res.status).toBe(200);
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: USER } }),
      { idempotencyKey: `customer-create-${USER}` },
    );
    expect(sub.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: USER, stripeCustomerId: { $exists: false } },
      { $set: { stripeCustomerId: 'cus_new' } },
      { new: true },
    );
  });

  it('checkout: uses the stored customer when another request won the race', async () => {
    sub.findOne.mockResolvedValue(null);
    sub.findOneAndUpdate
      .mockResolvedValueOnce({ userId: USER })
      .mockResolvedValueOnce(null); // lost the race
    sub.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeCustomerId: 'cus_winner' });
    await checkout(req('checkout', { userId: USER, priceId: 'price_pro_fake' }, 'internal-secret'));
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_winner' }),
    );
  });

  it('checkout: 500 instead of localhost when NEXT_PUBLIC_APP_URL is missing in production', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.stubEnv('NODE_ENV', 'production');
    sub.findOne.mockResolvedValue({ stripeCustomerId: 'cus_1', status: 'CANCELED', tier: 'FREE' });
    const res = await checkout(req('checkout', { userId: USER, priceId: 'price_pro_fake' }, 'internal-secret'));
    vi.unstubAllEnvs();
    expect(res.status).toBe(500);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
