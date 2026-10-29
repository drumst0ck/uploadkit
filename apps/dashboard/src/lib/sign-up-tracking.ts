import { User } from '@uploadkitdev/db';

// One-shot `sign_up` conversion tracking.
//  1. auth `createUser` (new accounts only) sets `signUpTrackingPending: true`.
//  2. auth `linkAccount` (fires right after for the same new account) records the provider.
//  3. The dashboard layout atomically claims the flag (findOneAndUpdate), so
//     concurrent renders/tabs cannot both win; only the winner renders the tracker.
// Existing users never have the flag, so they never match.

export type SignUpMethod = 'github' | 'google' | 'email';

export function toSignUpMethod(provider: string | undefined | null): SignUpMethod | null {
  if (provider === 'github' || provider === 'google') return provider;
  if (provider === 'resend' || provider === 'email') return 'email';
  return null;
}

export async function markSignUpPending(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { signUpTrackingPending: true } });
}

export async function recordSignUpMethod(userId: string, provider: string): Promise<void> {
  const method = toSignUpMethod(provider);
  if (!method) return;
  // Only touch users still pending, so linking a 2nd provider later is a no-op.
  await User.updateOne(
    { _id: userId, signUpTrackingPending: true },
    { $set: { signUpMethod: method } },
  );
}

/** Atomically claims the pending flag. Returns null when nothing to track or on any error. */
export async function consumeSignUpTracking(
  userId: string,
): Promise<{ method: SignUpMethod | null } | null> {
  try {
    const doc = await User.findOneAndUpdate(
      { _id: userId, signUpTrackingPending: true },
      { $unset: { signUpTrackingPending: '', signUpMethod: '' } },
      { new: false },
    )
      .select('signUpMethod')
      .lean()
      .exec();
    if (!doc) return null;
    return { method: toSignUpMethod(doc.signUpMethod) };
  } catch (err) {
    console.warn('[sign-up-tracking] consume failed:', err);
    return null;
  }
}
