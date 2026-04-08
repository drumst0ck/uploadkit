import { stripe } from '@/lib/stripe';

// Stripe Meter event name constants (must match meter names configured in Stripe dashboard)
export const METER_STORAGE = 'uploadkit_storage_bytes';
export const METER_BANDWIDTH = 'uploadkit_bandwidth_bytes';
export const METER_UPLOADS = 'uploadkit_upload_count';

/**
 * Send a metered billing event to Stripe for a paid user.
 *
 * Fire-and-forget: never throws. Meter failures must not block uploads (D-03).
 * Wrap with `void` at call sites to make fire-and-forget intent explicit.
 *
 * @param eventName - Stripe meter event name (use METER_* constants)
 * @param value     - Numeric value to report (bytes, count, etc.)
 * @param stripeCustomerId - The Stripe customer ID to bill against
 * @param identifier - Idempotency key; use file._id to prevent double-counting on retries (Pitfall 7)
 */
export async function sendMeterEvent(
  eventName: string,
  value: number,
  stripeCustomerId: string,
  identifier: string,
): Promise<void> {
  // Null-guard: skip silently in dev/CI environments without Stripe configured (Pitfall 2)
  if (!process.env.STRIPE_SECRET_KEY) {
    return;
  }

  try {
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        value: String(value),
        stripe_customer_id: stripeCustomerId,
      },
      identifier,
    });
  } catch (err) {
    // Log but never rethrow — meter failures must not affect the upload response (D-03)
    console.error('[stripe-meters] Failed to send meter event:', {
      eventName,
      value,
      stripeCustomerId,
      identifier,
      error: err,
    });
  }
}
