import type { Session } from 'next-auth';
import { connectDB, User } from '@uploadkitdev/db';

function csvSet(raw: string | undefined, lower: boolean): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((e) => (lower ? e.trim().toLowerCase() : e.trim()))
      .filter(Boolean),
  );
}

/**
 * Admin panel access. Either:
 *  - the user id is in ADMIN_USER_IDS (comma-separated), or
 *  - the stored account email is in ADMIN_EMAILS AND that email is verified
 *    (a provider-supplied but unverified address never grants admin).
 * The check reads the stored user, not the email claim carried by the session.
 */
export async function isAdminSession(session: Session | null): Promise<boolean> {
  const userId = session?.user?.id;
  if (!userId) return false;

  if (csvSet(process.env.ADMIN_USER_IDS, false).has(userId)) return true;

  const adminEmails = csvSet(process.env.ADMIN_EMAILS, true);
  if (adminEmails.size === 0) return false;

  await connectDB();
  const user = await User.findById(userId).select('email emailVerified').lean();
  if (!user?.email || !user.emailVerified) return false;
  return adminEmails.has(user.email.trim().toLowerCase());
}

/**
 * Email normalization helper for display comparisons.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
