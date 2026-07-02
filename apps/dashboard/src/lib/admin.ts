import type { Session } from 'next-auth';

/**
 * Comma-separated list of email addresses granted admin panel access.
 * Set via ADMIN_EMAILS env var. Emails are compared case-insensitively
 * after trimming whitespace.
 */
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminSession(session: Session | null): boolean {
  if (!session?.user?.email) return false;
  return getAdminEmails().has(session.user.email.toLowerCase());
}

/**
 * Email normalization helper for display comparisons.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
