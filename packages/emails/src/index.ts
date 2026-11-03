import { WelcomeEmail, type WelcomeEmailProps } from './templates/welcome';
import { UsageAlertEmail, type UsageAlertEmailProps } from './templates/usage-alert';
import { InvoiceEmail, type InvoiceEmailProps } from './templates/invoice';
import {
  InactiveWarningEmail,
  type InactiveWarningEmailProps,
} from './templates/inactive-warning';
import { TeamInviteEmail, type TeamInviteEmailProps } from './templates/team-invite';
import { renderSafe, sendEmail } from './lib/send';

// Re-export raw template components for preview / testing
export { WelcomeEmail, UsageAlertEmail, InvoiceEmail, InactiveWarningEmail, TeamInviteEmail };
export type {
  WelcomeEmailProps,
  UsageAlertEmailProps,
  InvoiceEmailProps,
  InactiveWarningEmailProps,
  TeamInviteEmailProps,
};

/**
 * Send the welcome email to a newly registered user.
 * Fire-and-forget — never throws.
 */
export async function sendWelcomeEmail(to: string, props: WelcomeEmailProps): Promise<void> {
  const html = await renderSafe(() => WelcomeEmail(props));
  if (html === null) return;
  await sendEmail({ to, subject: 'Welcome to UploadKit', html });
}

/**
 * Send a usage alert when a user hits 80% or 100% of a dimension limit.
 * Fire-and-forget — never throws.
 */
export async function sendUsageAlertEmail(to: string, props: UsageAlertEmailProps): Promise<void> {
  const subject =
    props.usagePercent === 100
      ? `You've reached your ${props.dimension} limit`
      : `You've used ${props.usagePercent}% of your ${props.dimension} limit`;
  const html = await renderSafe(() => UsageAlertEmail(props));
  if (html === null) return;
  await sendEmail({ to, subject, html });
}

/**
 * Send an invoice email for paid or failed payments.
 * Fire-and-forget — never throws.
 */
export async function sendInvoiceEmail(to: string, props: InvoiceEmailProps): Promise<void> {
  const subject =
    props.type === 'paid' ? 'Payment received' : 'Payment failed — action required';
  const html = await renderSafe(() => InvoiceEmail(props));
  if (html === null) return;
  await sendEmail({ to, subject, html });
}

/**
 * Send the inactive-account warning email (free-tier, 7 days before cleanup).
 * Fire-and-forget — never throws.
 */
export async function sendInactiveWarningEmail(
  to: string,
  props: InactiveWarningEmailProps,
): Promise<void> {
  const subject = `Your UploadKit files will be deleted in ${props.daysUntilDeletion} day${
    props.daysUntilDeletion === 1 ? '' : 's'
  }`;
  const html = await renderSafe(() => InactiveWarningEmail(props));
  if (html === null) return;
  await sendEmail({ to, subject, html });
}

/**
 * Send a team invitation with the accept link.
 * Fire-and-forget — never throws.
 */
export async function sendTeamInviteEmail(to: string, props: TeamInviteEmailProps): Promise<void> {
  const html = await renderSafe(() => TeamInviteEmail(props));
  if (html === null) return;
  await sendEmail({ to, subject: `${props.inviterName} invited you to UploadKit`, html });
}
