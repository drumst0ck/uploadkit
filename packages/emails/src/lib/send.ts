import type * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';

// Singleton: only created when API key is present (null-guard for dev/test)
// RESEND_API_KEY is the name production uses; AUTH_RESEND_KEY (documented in
// .env.example for Auth.js) is accepted as a fallback.
const resendKey = process.env.RESEND_API_KEY || process.env.AUTH_RESEND_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

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
    console.warn('[emails] RESEND_API_KEY (or AUTH_RESEND_KEY) not set — skipping email send');
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

/** Render a template; a render failure is logged and yields null so callers never throw. */
export async function renderSafe(build: () => React.ReactElement): Promise<string | null> {
  try {
    return await render(build());
  } catch (error) {
    console.error('[emails] Failed to render email:', error);
    return null;
  }
}
