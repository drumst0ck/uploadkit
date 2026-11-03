import { describe, it, expect, vi } from 'vitest';
import { resolveCheckoutPlan, checkoutTrialParams, cancelStaleSubscription } from '../src/billing';

const env = {
  STRIPE_PRO_PRICE_ID: 'p_m',
  STRIPE_PRO_YEARLY_PRICE_ID: 'p_y',
  STRIPE_TEAM_PRICE_ID: 't_m',
  STRIPE_TEAM_YEARLY_PRICE_ID: 't_y',
};

describe('resolveCheckoutPlan', () => {
  it('maps Team yearly to TEAM/year', () => {
    expect(resolveCheckoutPlan('t_y', env)).toEqual({ tier: 'TEAM', interval: 'year' });
  });
  it('keeps the other plans', () => {
    expect(resolveCheckoutPlan('t_m', env)).toEqual({ tier: 'TEAM', interval: 'month' });
    expect(resolveCheckoutPlan('p_y', env)).toEqual({ tier: 'PRO', interval: 'year' });
  });
  it('does not match when the Team yearly env is unset (undefined never equals a price)', () => {
    expect(resolveCheckoutPlan('', env)).toBeNull();
    expect(resolveCheckoutPlan('t_y', { ...env, STRIPE_TEAM_YEARLY_PRICE_ID: undefined })).toBeNull();
  });
  it('Team yearly never trials', () => {
    expect(checkoutTrialParams({ tier: 'TEAM', interval: 'year' }, true)).toEqual({ subscriptionData: {}, topLevel: {} });
  });
});

describe('cancelStaleSubscription', () => {
  const make = (status: string | Error) => ({
    retrieve: vi.fn(() => (status instanceof Error ? Promise.reject(status) : Promise.resolve({ status }))),
    cancel: vi.fn().mockResolvedValue({}),
  });
  const quiet = { error: vi.fn(), info: vi.fn() };

  for (const status of ['unpaid', 'incomplete', 'past_due', 'paused']) {
    it(`cancels a ${status} subscription`, async () => {
      const subs = make(status);
      await expect(cancelStaleSubscription(subs, 'sub_old', quiet)).resolves.toBe('canceled');
      expect(subs.retrieve).toHaveBeenCalledWith('sub_old');
      expect(subs.cancel).toHaveBeenCalledWith('sub_old');
    });
  }
  for (const status of ['active', 'trialing']) {
    it(`never cancels a ${status} subscription`, async () => {
      const subs = make(status);
      await expect(cancelStaleSubscription(subs, 'sub_old', quiet)).resolves.toBe('skipped_live');
      expect(subs.cancel).not.toHaveBeenCalled();
    });
  }
  it('does nothing for already terminal subscriptions', async () => {
    const subs = make('canceled');
    await expect(cancelStaleSubscription(subs, 'sub_old', quiet)).resolves.toBe('gone');
    expect(subs.cancel).not.toHaveBeenCalled();
  });
  it('logs and reports failure instead of throwing when Stripe errors', async () => {
    const subs = make('unpaid');
    subs.cancel.mockRejectedValue(new Error('stripe down'));
    await expect(cancelStaleSubscription(subs, 'sub_old', quiet)).resolves.toBe('failed');
    expect(quiet.error).toHaveBeenCalled();
    const gone = make(Object.assign(new Error('nope'), { code: 'resource_missing' }));
    await expect(cancelStaleSubscription(gone, 'sub_old', quiet)).resolves.toBe('gone');
  });
});
