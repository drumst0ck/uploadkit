import { Resend } from 'resend';

// Singleton: only created when API key is present (null-guard for dev/test)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Fire-and-forget email send via Resend.
 * - No-op (with console.warn) when RESEND_API_KEY is absent.
 * - Swallows all errors server-side — never surfaces to API response (T-07-11).
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!resend) {
    console.warn('[emails] RESEND_API_KEY not set — skipping email send');
    return;
  }

  try {
    await resend.emails.send({
      from: 'UploadKit <noreply@updates.uploadkit.dev>',
      to,
      subject,
      html,
    });
  } catch (error) {
    // Never throw — email failure must not break primary request flow (T-07-11)
    console.error('[emails] Failed to send email:', error);
  }
}
