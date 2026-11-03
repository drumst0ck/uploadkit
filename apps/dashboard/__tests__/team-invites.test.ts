import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';

const h = vi.hoisted(() => ({ session: undefined as any, sendInvite: undefined as any }));

vi.mock('../auth', () => ({ auth: async () => h.session }));
vi.mock('@uploadkitdev/db', async () => ({
  connectDB: async () => undefined,
  TeamMember: (await import('./helpers')).makeTeamMemberModel(),
}));
vi.mock('@uploadkitdev/emails', () => ({
  sendTeamInviteEmail: (...a: any[]) => h.sendInvite(...a),
}));
vi.mock('@/lib/tier', () => ({ getUserTier: async () => 'TEAM' }));

import { POST, GET } from '@/app/api/internal/team/route';
import { POST as ACCEPT } from '@/app/api/internal/team/accept/route';
import { TeamMember } from '@uploadkitdev/db';

const model = TeamMember as any;
const sendInvite = vi.fn(async (..._a: any[]) => undefined);
h.sendInvite = sendInvite;
let session: any;

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/internal/team', { method: 'POST', body: JSON.stringify(body) });
const accept = (token: unknown) =>
  new NextRequest('http://localhost/api/internal/team/accept', { method: 'POST', body: JSON.stringify({ token }) });

beforeEach(() => {
  model.docs.length = 0;
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
  h.session = session = { user: { id: 'owner1', email: 'owner@x.com' } };
});

describe('team invitations', () => {
  it('emails a link with a raw token and stores only its hash with an expiry', async () => {
    const res = await POST(post({ email: 'Bob@X.com' }));
    expect(res.status).toBe(200);
    expect(sendInvite).toHaveBeenCalledTimes(1);
    const [to, props] = sendInvite.mock.calls[0] as any;
    expect(to).toBe('bob@x.com');
    const token = new URL(props.acceptUrl).searchParams.get('token')!;
    expect(props.acceptUrl.startsWith('https://app.test/dashboard/team/accept?token=')).toBe(true);
    const stored = model.docs[0]!;
    expect(stored.inviteTokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored.inviteExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(await res.json())).not.toContain(token);
  });

  it('GET never returns token or hash', async () => {
    await POST(post({ email: 'bob@x.com' }));
    const body = JSON.stringify(await (await GET()).json());
    expect(body).not.toMatch(/inviteToken/);
  });

  it('seat limit holds under concurrent invites (invitees fill `limit` seats)', async () => {
    // TEAM limit 5 => up to 5 invitees; fire 8 at once
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => POST(post({ email: `u${i}@x.com` }))),
    );
    expect(results.filter((r) => r.status === 200).length).toBeLessThanOrEqual(5);
    expect(model.docs.length).toBeLessThanOrEqual(5);
    expect(results.every((r) => r.status === 200 || r.status === 403)).toBe(true);
  });

  it('allows exactly `limit` invitees sequentially and rejects the next', async () => {
    for (let i = 0; i < 5; i++) expect((await POST(post({ email: `s${i}@x.com` }))).status).toBe(200);
    expect((await POST(post({ email: 'extra@x.com' }))).status).toBe(403);
    expect(model.docs.length).toBe(5);
  });

  async function invite(email = 'bob@x.com') {
    await POST(post({ email }));
    const props = (sendInvite.mock.calls.at(-1) as any)[1];
    return new URL(props.acceptUrl).searchParams.get('token')!;
  }

  it('accept activates the invite for the matching signed-in email', async () => {
    const token = await invite();
    h.session = session = { user: { id: 'bob1', email: 'BOB@x.com' } };
    const res = await ACCEPT(accept(token));
    expect(res.status).toBe(200);
    expect(model.docs[0]).toMatchObject({ status: 'active', memberUserId: 'bob1' });
    expect(model.docs[0]!.inviteTokenHash).toBeUndefined();
    expect((await ACCEPT(accept(token))).status).toBe(404);
  });

  it('accept rejects a different email and leaves the invite untouched', async () => {
    const token = await invite();
    h.session = session = { user: { id: 'eve1', email: 'eve@x.com' } };
    const res = await ACCEPT(accept(token));
    expect(res.status).toBe(403);
    expect(model.docs[0]).toMatchObject({ status: 'pending' });
    expect(model.docs[0]!.inviteTokenHash).toBeDefined();
  });

  it('accept rejects expired invites and unauthenticated callers', async () => {
    const token = await invite();
    model.docs[0]!.inviteExpiresAt = new Date(Date.now() - 1000);
    h.session = session = { user: { id: 'bob1', email: 'bob@x.com' } };
    expect((await ACCEPT(accept(token))).status).toBe(410);
    expect(model.docs[0]!.status).toBe('pending');
    h.session = session = null;
    expect((await ACCEPT(accept(token))).status).toBe(401);
  });
});
