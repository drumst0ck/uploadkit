import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface UsageAlertEmailProps {
  userName: string;
  usagePercent: 80 | 100;
  dimension: 'storage' | 'bandwidth' | 'uploads';
  currentUsage: string;
  limit: string;
  tier: string;
  upgradeUrl?: string;
}

const DEFAULT_UPGRADE_URL = 'https://app.uploadkit.dev/dashboard/billing';

const DIMENSION_LABELS: Record<UsageAlertEmailProps['dimension'], string> = {
  storage: 'storage',
  bandwidth: 'bandwidth',
  uploads: 'upload limit',
};

// Dark theme color palette — inline styles only (email client compatibility)
const colors = {
  surface: '#0a0a0b',
  surfaceElevated: '#141416',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  accent: '#6366f1',
  accentHover: '#818cf8',
  warning: '#f59e0b',  // amber — 80% threshold
  danger: '#ef4444',   // red — 100% threshold
  warningMuted: 'rgba(245,158,11,0.12)',
  dangerMuted: 'rgba(239,68,68,0.12)',
};

export function UsageAlertEmail({
  userName,
  usagePercent,
  dimension,
  currentUsage,
  limit,
  tier,
  upgradeUrl,
}: UsageAlertEmailProps) {
  const billingUrl = upgradeUrl ?? DEFAULT_UPGRADE_URL;
  const dimensionLabel = DIMENSION_LABELS[dimension];
  const is100 = usagePercent === 100;

  const alertColor = is100 ? colors.danger : colors.warning;
  const alertMuted = is100 ? colors.dangerMuted : colors.warningMuted;
  const alertIcon = is100 ? '🚨' : '⚠️';

  const previewText = is100
    ? `You've reached your ${dimensionLabel} limit — upgrade to continue.`
    : `You've used ${usagePercent}% of your ${dimensionLabel} — consider upgrading.`;

  const headingText = is100
    ? `You've reached your ${dimensionLabel} limit`
    : `You've used ${usagePercent}% of your ${dimensionLabel}`;

  const bodyText = is100
    ? `Your account (${tier} plan) has reached the ${dimensionLabel} limit for this billing period. To continue using UploadKit without interruption, upgrade your plan.`
    : `Your account (${tier} plan) is at ${usagePercent}% of its ${dimensionLabel} limit. You still have capacity, but now is a good time to consider upgrading to avoid hitting the limit.`;

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

          {/* Alert banner */}
          <Section
            style={{
              ...styles.alertBanner,
              backgroundColor: alertMuted,
              borderBottom: `1px solid ${alertColor}`,
            }}
          >
            <Text style={{ ...styles.alertBannerText, color: alertColor }}>
              {alertIcon}&nbsp;&nbsp;
              {is100 ? 'Usage limit reached' : `${usagePercent}% of limit used`}
            </Text>
          </Section>

          {/* Hero */}
          <Section style={styles.hero}>
            <Heading style={styles.h1}>{headingText}</Heading>
            <Text style={styles.subtext}>Hi {userName},</Text>
            <Text style={styles.subtext}>{bodyText}</Text>
          </Section>

          {/* Usage meter */}
          <Section style={styles.meterSection}>
            <table style={styles.meterTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={styles.meterLabel}>Current usage</td>
                  <td style={{ ...styles.meterValue, color: alertColor }}>
                    {currentUsage}
                  </td>
                </tr>
                <tr>
                  <td style={styles.meterLabel}>Plan limit</td>
                  <td style={styles.meterValue}>{limit}</td>
                </tr>
                <tr>
                  <td style={styles.meterLabel}>Plan</td>
                  <td style={styles.meterValue}>{tier}</td>
                </tr>
              </tbody>
            </table>

            {/* Progress bar */}
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: alertColor,
                }}
              />
            </div>
            <Text style={styles.progressLabel}>{usagePercent}% used</Text>
          </Section>

          {/* CTA */}
          <Section style={styles.ctaSection}>
            <Button href={billingUrl} style={{ ...styles.button, backgroundColor: alertColor }}>
              Upgrade Plan →
            </Button>
            <Text style={styles.ctaNote}>
              Upgrading takes seconds — no downtime, no data loss.
            </Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerMuted}>
              You received this alert because your UploadKit account reached a usage threshold.
              <br />
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
  alertBanner: {
    padding: '16px 40px',
  },
  alertBannerText: {
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
  subtext: {
    color: colors.textSecondary,
    fontSize: '16px',
    lineHeight: '1.7',
    margin: '0 0 12px',
  },
  meterSection: {
    padding: '0 40px 32px',
  },
  meterTable: {
    borderCollapse: 'collapse',
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '10px',
    marginBottom: '20px',
    padding: '20px',
    width: '100%',
  },
  meterLabel: {
    color: colors.textSecondary,
    fontSize: '13px',
    padding: '6px 20px 6px 0',
    width: '40%',
  },
  meterValue: {
    color: colors.textPrimary,
    fontSize: '14px',
    fontWeight: '600',
    padding: '6px 0',
  },
  progressTrack: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '100px',
    height: '8px',
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: '100px',
    height: '8px',
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: '13px',
    margin: '8px 0 0',
    textAlign: 'right',
  },
  ctaSection: {
    padding: '0 40px 40px',
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
  ctaNote: {
    color: colors.textSecondary,
    fontSize: '13px',
    margin: '12px 0 0',
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
  footerMuted: {
    color: '#52525b',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default UsageAlertEmail;
