import { render } from '@react-email/render';

import { WelcomeEmail, type WelcomeEmailProps } from './templates/welcome';
import { UsageAlertEmail, type UsageAlertEmailProps } from './templates/usage-alert';
import { InvoiceEmail, type InvoiceEmailProps } from './templates/invoice';
import { sendEmail } from './lib/send';

// Re-export raw template components for preview / testing
export { WelcomeEmail, UsageAlertEmail, InvoiceEmail };
export type { WelcomeEmailProps, UsageAlertEmailProps, InvoiceEmailProps };

/**
 * Send the welcome email to a newly registered user.
 * Fire-and-forget — never throws.
 */
export async function sendWelcomeEmail(to: string, props: WelcomeEmailProps): Promise<void> {
  const html = await render(WelcomeEmail(props));
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
  const html = await render(UsageAlertEmail(props));
  await sendEmail({ to, subject, html });
}

/**
 * Send an invoice email for paid or failed payments.
 * Fire-and-forget — never throws.
 */
export async function sendInvoiceEmail(to: string, props: InvoiceEmailProps): Promise<void> {
  const subject =
    props.type === 'paid' ? 'Payment received' : 'Payment failed — action required';
  const html = await render(InvoiceEmail(props));
  await sendEmail({ to, subject, html });
}
