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

export interface WelcomeEmailProps {
  userName: string;
  loginUrl?: string;
}

const DEFAULT_LOGIN_URL = 'https://app.uploadkit.dev/dashboard';

// Dark theme color palette — inline styles only (email client compatibility)
const colors = {
  surface: '#0a0a0b',
  surfaceElevated: '#141416',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  accent: '#6366f1',
  accentHover: '#818cf8',
  accentMuted: 'rgba(99,102,241,0.12)',
};

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  const dashboardUrl = loginUrl ?? DEFAULT_LOGIN_URL;

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to UploadKit — file uploads in minutes, not days.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header / Logo */}
          <Section style={styles.header}>
            <Text style={styles.logo}>⬡ UploadKit</Text>
          </Section>

          {/* Hero */}
          <Section style={styles.hero}>
            <Text style={styles.badge}>Welcome aboard</Text>
            <Heading style={styles.h1}>
              Hey {userName}, you're in.
            </Heading>
            <Text style={styles.subtext}>
              Your UploadKit account is ready. You now have access to managed file storage,
              direct-to-R2 uploads, and premium React components — all on a generous free tier.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={styles.ctaSection}>
            <Button href={dashboardUrl} style={styles.button}>
              Go to Dashboard →
            </Button>
          </Section>

          <Hr style={styles.divider} />

          {/* Feature highlights */}
          <Section style={styles.featuresSection}>
            <Heading as="h2" style={styles.h2}>
              What you get on the free tier
            </Heading>
            <table style={styles.featureTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={styles.featureIcon}>📦</td>
                  <td>
                    <Text style={styles.featureTitle}>5 GB Storage</Text>
                    <Text style={styles.featureDesc}>
                      Store your files on Cloudflare R2 with global CDN. No egress fees.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={styles.featureIcon}>⚡</td>
                  <td>
                    <Text style={styles.featureTitle}>Direct Uploads</Text>
                    <Text style={styles.featureDesc}>
                      Presigned URLs — files go straight from your users to R2. Your server
                      never proxies a byte.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={styles.featureIcon}>🧩</td>
                  <td>
                    <Text style={styles.featureTitle}>SDK Components</Text>
                    <Text style={styles.featureDesc}>
                      UploadButton, UploadDropzone, FileList — premium React components with
                      dark mode and CSS variable theming.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={styles.featureIcon}>🔑</td>
                  <td>
                    <Text style={styles.featureTitle}>API Keys</Text>
                    <Text style={styles.featureDesc}>
                      Generate <code style={styles.code}>uk_live_</code> and{' '}
                      <code style={styles.code}>uk_test_</code> keys from your dashboard.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* Quick start */}
          <Section style={styles.quickStart}>
            <Heading as="h2" style={styles.h2}>
              Get started in 2 minutes
            </Heading>
            <Text style={styles.codeBlock}>
              npm install @uploadkitdev/react @uploadkitdev/next
            </Text>
            <Text style={styles.subtext}>
              Then head to the{' '}
              <Link href="https://docs.uploadkit.dev/quickstart" style={styles.link}>
                quickstart guide
              </Link>{' '}
              for a step-by-step walkthrough.
            </Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Questions? Reply to this email or join us on{' '}
              <Link href="https://github.com/uploadkit" style={styles.link}>
                GitHub
              </Link>
              {' · '}
              <Link href="https://discord.gg/uploadkit" style={styles.link}>
                Discord
              </Link>
            </Text>
            <Text style={styles.footerMuted}>
              You received this email because you signed up for UploadKit.
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
  hero: {
    padding: '48px 40px 32px',
  },
  badge: {
    backgroundColor: colors.accentMuted,
    border: `1px solid ${colors.accent}`,
    borderRadius: '100px',
    color: colors.accentHover,
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
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '-0.8px',
    lineHeight: '1.2',
    margin: '0 0 16px',
  },
  h2: {
    color: colors.textPrimary,
    fontSize: '20px',
    fontWeight: '600',
    letterSpacing: '-0.3px',
    margin: '0 0 20px',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: '16px',
    lineHeight: '1.7',
    margin: '0',
  },
  ctaSection: {
    padding: '0 40px 40px',
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
  featuresSection: {
    padding: '40px',
  },
  featureTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  featureIcon: {
    fontSize: '24px',
    paddingRight: '16px',
    paddingBottom: '24px',
    verticalAlign: 'top',
    width: '40px',
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 4px',
  },
  featureDesc: {
    color: colors.textSecondary,
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  code: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '4px',
    color: colors.accentHover,
    fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
    fontSize: '13px',
    padding: '1px 6px',
  },
  quickStart: {
    padding: '40px',
  },
  codeBlock: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: '8px',
    color: colors.accentHover,
    fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
    fontSize: '13px',
    margin: '0 0 16px',
    padding: '16px 20px',
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
    fontSize: '14px',
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

export default WelcomeEmail;
