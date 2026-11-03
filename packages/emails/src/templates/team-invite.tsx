import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface TeamInviteEmailProps {
  inviterName: string;
  role: 'admin' | 'member';
  acceptUrl: string;
  expiresInDays: number;
}

export function TeamInviteEmail({ inviterName, role, acceptUrl, expiresInDays }: TeamInviteEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${inviterName} invited you to their UploadKit team`}</Preview>
      <Body style={{ backgroundColor: '#05050a', fontFamily: 'sans-serif', padding: '40px 0' }}>
        <Container
          style={{
            backgroundColor: '#0a0a0b',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            maxWidth: '560px',
            margin: '0 auto',
            padding: '40px',
          }}
        >
          <Heading style={{ color: '#fafafa', fontSize: '24px', margin: '0 0 16px' }}>
            Join {inviterName} on UploadKit
          </Heading>
          <Text style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: '1.7' }}>
            You were invited as {role === 'admin' ? 'an admin' : 'a member'}. Sign in with this
            email address to accept. The link expires in {expiresInDays} days.
          </Text>
          <Section style={{ padding: '16px 0' }}>
            <Button
              href={acceptUrl}
              style={{
                backgroundColor: '#6366f1',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                padding: '14px 28px',
                textDecoration: 'none',
              }}
            >
              Accept invitation
            </Button>
          </Section>
          <Text style={{ color: '#52525b', fontSize: '12px' }}>
            If you did not expect this invitation you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TeamInviteEmail;
