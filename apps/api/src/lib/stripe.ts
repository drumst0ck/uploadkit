import Stripe from 'stripe';

// Lazy singleton — instantiated on first request, not at module load time.
// This prevents the build-time throw when STRIPE_SECRET_KEY is absent in CI/build envs.
let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

/**
 * Stripe singleton for use in API route handlers.
 * Accessing this at module scope is safe — it is a getter evaluated at call time.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});
