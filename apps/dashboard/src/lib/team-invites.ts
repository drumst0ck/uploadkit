import { createHash, randomBytes } from 'node:crypto';

/** Invitations stop being acceptable after this long. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Fresh raw token (emailed, never stored) with its stored hash and expiry. */
export function createInviteToken(now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(now + INVITE_TTL_MS),
  };
}
