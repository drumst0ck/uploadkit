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

export interface InactiveWarningEmailProps {
  userName: string;
  /** Days remaining before files are deleted */
  daysUntilDeletion: number;
  /** Number of files at risk */
  fileCount: number;
  /** Human-readable storage size (e.g. "2.4 GB") */
  storageHuman: string;
  loginUrl?: string;
}

const DEFAULT_LOGIN_URL = 'https://app.uploadkit.dev/dashboard';

const colors = {
  surface: '#0a0a0b',
  surfaceElevated: '#141416',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  accent: '#6366f1',
  accentHover: '#818cf8',
  accentMuted: 'rgba(99,102,241,0.12)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245,158,11,0.12)',
};

export function InactiveWarningEmail({
  userName,
  daysUntilDeletion,
  fileCount,
  storageHuman,
  loginUrl,
}: InactiveWarningEmailProps) {
  const dashboardUrl = loginUrl ?? DEFAULT_LOGIN_URL;

  return (
    <Html lang="en">
      <Head />
      <Preview>{`Your UploadKit files will be deleted in ${daysUntilDeletion} days — log in to keep them.`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logo}>⬡ UploadKit</Text>
          </Section>

          <Section style={styles.hero}>
            <Text style={styles.badge}>Account inactivity notice</Text>
            <Heading style={styles.h1}>
              Hey {userName}, we haven&apos;t seen you in a while.
            </Heading>
            <Text style={styles.subtext}>
              Your UploadKit account has been inactive for 23 days. To keep free-tier
              storage healthy, we clean up files on accounts that stay inactive for 30
              days — so your files will be removed in{' '}
              <strong style={styles.strong}>
                {daysUntilDeletion} day{daysUntilDeletion === 1 ? '' : 's'}
              </strong>
              .
            </Text>
          </Section>

          <Section style={styles.statsSection}>
            <table style={styles.statsTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>{fileCount.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Files at risk</Text>
                  </td>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>{storageHuman}</Text>
                    <Text style={styles.statLabel}>Storage at risk</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={styles.ctaSection}>
            <Text style={styles.ctaHint}>
              One click is enough — just log in and your account stays safe.
            </Text>
            <Button href={dashboardUrl} style={styles.button}>
              Log in to keep my files →
            </Button>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.policySection}>
            <Heading as="h2" style={styles.h2}>
              Why we do this
            </Heading>
            <Text style={styles.subtext}>
              The free tier is subsidised by paid customers, so we reclaim storage from
              abandoned accounts to keep it sustainable. Paid accounts are never subject
              to this policy — as long as your subscription is active, your data stays
              put forever.
            </Text>
            <Text style={{ ...styles.subtext, marginTop: '16px' }}>
              Your account, API keys and project configuration will{' '}
              <strong style={styles.strong}>not</strong> be deleted — only the files in
              storage. You can always start uploading again after logging in.
            </Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Questions? Reply to this email.{' '}
              <Link
                href="https://app.uploadkit.dev/dashboard/billing"
                style={styles.link}
              >
                Upgrade to a paid plan
              </Link>{' '}
              to opt out of inactivity cleanup entirely.
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
  hero: {
    padding: '48px 40px 24px',
  },
  badge: {
    backgroundColor: colors.warningMuted,
    border: `1px solid ${colors.warning}`,
    borderRadius: '100px',
    color: colors.warning,
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    margin: '0 0 16px',
    padding: '4px 12px',
    textTransform: 'uppercase',
  },
  h1: {
    color: colors.textPrimary,
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.6px',
    lineHeight: '1.25',
    margin: '0 0 16px',
  },
  h2: {
    color: colors.textPrimary,
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '-0.3px',
    margin: '0 0 12px',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0',
  },
  strong: {
    color: colors.textPrimary,
    fontWeight: 600,
  },
  statsSection: {
    padding: '0 40px 24px',
  },
  statsTable: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '12px',
  },
  statCell: {
    padding: '24px',
    textAlign: 'center',
    verticalAlign: 'top',
    width: '50%',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.4px',
    margin: '0 0 4px',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.3px',
    margin: 0,
    textTransform: 'uppercase',
  },
  ctaSection: {
    padding: '0 40px 40px',
    textAlign: 'center',
  },
  ctaHint: {
    color: colors.textSecondary,
    fontSize: '14px',
    margin: '0 0 16px',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: '10px',
    color: '#fff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: '600',
    padding: '14px 28px',
    textDecoration: 'none',
  },
  divider: {
    borderColor: colors.surfaceBorder,
    borderTop: `1px solid ${colors.surfaceBorder}`,
    margin: '0 40px',
  },
  policySection: {
    padding: '40px',
  },
  link: {
    color: colors.accentHover,
    textDecoration: 'underline',
  },
  footer: {
    padding: '32px 40px 40px',
    textAlign: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0 0 12px',
  },
  footerMuted: {
    color: '#52525b',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default InactiveWarningEmail;
