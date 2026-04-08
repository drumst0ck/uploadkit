import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface InvoiceEmailProps {
  userName: string;
  type: 'paid' | 'failed';
  amount: string;
  invoiceUrl?: string;
  date: string;
}

const DEFAULT_BILLING_URL = 'https://app.uploadkit.dev/dashboard/billing';

// Dark theme color palette — inline styles only (email client compatibility)
const colors = {
  surface: '#0a0a0b',
  surfaceElevated: '#141416',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  success: '#22c55e',   // green — payment received
  danger: '#ef4444',    // red — payment failed
  successMuted: 'rgba(34,197,94,0.12)',
  dangerMuted: 'rgba(239,68,68,0.12)',
};

export function InvoiceEmail({ userName, type, amount, invoiceUrl, date }: InvoiceEmailProps) {
  const isPaid = type === 'paid';

  const accentColor = isPaid ? colors.success : colors.danger;
  const accentMuted = isPaid ? colors.successMuted : colors.dangerMuted;
  const statusIcon = isPaid ? '✅' : '❌';
  const statusLabel = isPaid ? 'Payment received' : 'Payment failed';

  const previewText = isPaid
    ? `Payment of ${amount} received — thank you.`
    : `Payment of ${amount} failed — action required.`;

  const headingText = isPaid ? 'Payment received' : 'Payment failed — action required';

  const bodyText = isPaid
    ? `Hi ${userName}, we've received your payment of ${amount} on ${date}. Thank you for being a valued UploadKit customer. Your subscription is active and your account is in good standing.`
    : `Hi ${userName}, we were unable to process your payment of ${amount} on ${date}. To keep your subscription active, please update your payment method as soon as possible.`;

  const ctaLabel = isPaid ? 'View Invoice →' : 'Update Payment Method →';
  const ctaUrl = invoiceUrl ?? DEFAULT_BILLING_URL;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header / Logo */}
          <Section style={styles.header}>
            <Text style={styles.logo}>⬡ UploadKit</Text>
          </Section>

          {/* Status banner */}
          <Section
            style={{
              ...styles.statusBanner,
              backgroundColor: accentMuted,
              borderBottom: `1px solid ${accentColor}`,
            }}
          >
            <Text style={{ ...styles.statusBannerText, color: accentColor }}>
              {statusIcon}&nbsp;&nbsp;{statusLabel}
            </Text>
          </Section>

          {/* Hero */}
          <Section style={styles.hero}>
            <Heading style={styles.h1}>{headingText}</Heading>
            <Text style={styles.bodyText}>{bodyText}</Text>
          </Section>

          {/* Invoice summary card */}
          <Section style={styles.cardSection}>
            <table
              style={{
                ...styles.card,
                borderTop: `3px solid ${accentColor}`,
              }}
              cellPadding={0}
              cellSpacing={0}
            >
              <tbody>
                <tr>
                  <td style={styles.cardLabel}>Amount</td>
                  <td style={{ ...styles.cardValue, color: accentColor, fontSize: '24px' }}>
                    {amount}
                  </td>
                </tr>
                <tr>
                  <td style={styles.cardLabel}>Date</td>
                  <td style={styles.cardValue}>{date}</td>
                </tr>
                <tr>
                  <td style={styles.cardLabel}>Status</td>
                  <td style={{ ...styles.cardValue, color: accentColor }}>
                    {isPaid ? 'Paid' : 'Failed'}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA */}
          <Section style={styles.ctaSection}>
            <Button
              href={ctaUrl}
              style={{ ...styles.button, backgroundColor: accentColor }}
            >
              {ctaLabel}
            </Button>
          </Section>

          {/* Failure-specific help text */}
          {!isPaid && (
            <Section style={styles.helpSection}>
              <Text style={styles.helpHeading}>What happens next?</Text>
              <Text style={styles.helpItem}>
                1. Update your payment method in the{' '}
                <Link href={DEFAULT_BILLING_URL} style={{ ...styles.link, color: colors.danger }}>
                  billing dashboard
                </Link>
                .
              </Text>
              <Text style={styles.helpItem}>
                2. Stripe will automatically retry the payment after you update your card.
              </Text>
              <Text style={styles.helpItem}>
                3. Your account remains active during the retry window. No data will be lost.
              </Text>
            </Section>
          )}

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Questions? Reply to this email or visit{' '}
              <Link href="https://uploadkit.dev/support" style={styles.link}>
                uploadkit.dev/support
              </Link>
            </Text>
            <Text style={styles.footerMuted}>
              UploadKit · uploadkit.dev
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: '#05050a',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
    margin: 0,
    padding: '40px 0',
  },
  container: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '16px',
    maxWidth: '600px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.surfaceElevated,
    borderBottom: `1px solid ${colors.surfaceBorder}`,
    padding: '24px 40px',
  },
  logo: {
    color: colors.textPrimary,
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  statusBanner: {
    padding: '16px 40px',
  },
  statusBannerText: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    margin: 0,
    textTransform: 'uppercase',
  },
  hero: {
    padding: '40px 40px 24px',
  },
  h1: {
    color: colors.textPrimary,
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.6px',
    lineHeight: '1.2',
    margin: '0 0 16px',
  },
  bodyText: {
    color: colors.textSecondary,
    fontSize: '16px',
    lineHeight: '1.7',
    margin: 0,
  },
  cardSection: {
    padding: '0 40px 32px',
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '10px',
    padding: '24px',
    width: '100%',
    borderCollapse: 'collapse',
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: '13px',
    padding: '8px 20px 8px 0',
    width: '40%',
  },
  cardValue: {
    color: colors.textPrimary,
    fontSize: '16px',
    fontWeight: '600',
    padding: '8px 0',
  },
  ctaSection: {
    padding: '0 40px 32px',
    textAlign: 'center',
  },
  button: {
    borderRadius: '10px',
    color: '#fff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: '600',
    padding: '14px 28px',
    textDecoration: 'none',
  },
  helpSection: {
    backgroundColor: colors.surfaceElevated,
    borderTop: `1px solid ${colors.surfaceBorder}`,
    padding: '32px 40px',
  },
  helpHeading: {
    color: colors.textPrimary,
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 16px',
  },
  helpItem: {
    color: colors.textSecondary,
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 10px',
  },
  link: {
    color: '#818cf8',
    textDecoration: 'underline',
  },
  divider: {
    borderColor: colors.surfaceBorder,
    borderTop: `1px solid ${colors.surfaceBorder}`,
    margin: '0 40px',
  },
  footer: {
    padding: '32px 40px 40px',
    textAlign: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 8px',
  },
  footerMuted: {
    color: '#52525b',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default InvoiceEmail;
