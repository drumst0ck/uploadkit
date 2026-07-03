import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

export interface CloudflareOAuthState {
  userId: string;
  slug: string;
  domain: string;
  nonce: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return secret;
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createCloudflareOAuthState(
  input: Omit<CloudflareOAuthState, 'nonce' | 'exp'> & { nonce?: string; exp?: number },
): string {
  const state: CloudflareOAuthState = {
    ...input,
    nonce: input.nonce ?? randomUUID(),
    exp: input.exp ?? Date.now() + STATE_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function parseCloudflareOAuthState(token: string): CloudflareOAuthState {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    throw new Error('Invalid OAuth state');
  }

  const expected = signPayload(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid OAuth state signature');
  }

  const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CloudflareOAuthState;
  if (!state.userId || !state.slug || !state.domain || !state.exp) {
    throw new Error('Invalid OAuth state payload');
  }
  if (Date.now() > state.exp) {
    throw new Error('OAuth state expired');
  }

  return state;
}

export function getCloudflareOAuthRedirectUri(): string {
  const base = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/api/internal/cloudflare/oauth/callback`;
}
