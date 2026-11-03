import { sendWelcomeEmail } from '@uploadkitdev/emails';

/** Fire-and-forget welcome email: a render/send failure is logged, never an unhandled rejection. */
export async function sendWelcomeEmailSafe(to: string, userName: string): Promise<void> {
  try {
    await sendWelcomeEmail(to, {
      userName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.uploadkit.dev'}/dashboard`,
    });
  } catch (err) {
    console.error('[welcome-email] failed to send:', err);
  }
}
