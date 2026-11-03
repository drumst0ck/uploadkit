import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectDB, TeamMember, type ITeamMember } from '@uploadkitdev/db';
import { getUserTier } from '../../../../lib/tier';
import { getTeamMemberLimit } from '@uploadkitdev/shared';
import { sendTeamInviteEmail } from '@uploadkitdev/emails';
import { getAppUrl } from '../../../../lib/app-url';
import { createInviteToken, INVITE_TTL_MS } from '../../../../lib/team-invites';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  // Never expose invite token material (hash included) to the client.
  const members = await TeamMember.find({ ownerUserId: session.user.id })
    .sort({ createdAt: 1 })
    .select('-inviteTokenHash -inviteToken')
    .lean();

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  const limit = getTeamMemberLimit(tier);
  if (limit <= 1) {
    return NextResponse.json({ error: 'Team invites require Team plan or higher' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email =
    typeof body === 'object' &&
    body !== null &&
    'email' in body &&
    typeof (body as { email: unknown }).email === 'string'
      ? (body as { email: string }).email.trim().toLowerCase()
      : '';

  const role =
    typeof body === 'object' &&
    body !== null &&
    'role' in body &&
    ((body as { role: unknown }).role === 'admin' || (body as { role: unknown }).role === 'member')
      ? (body as { role: 'admin' | 'member' }).role
      : 'member';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  await connectDB();

  // Invitees may fill `limit` seats (the owner is not counted), as sold on the pricing page.
  const maxInvitees = limit;
  const ownerUserId = session.user.id;

  const existing = await TeamMember.findOne({ ownerUserId, email });
  const { token, tokenHash, expiresAt } = createInviteToken();
  let member: ITeamMember;

  if (existing) {
    const expired =
      existing.status === 'pending' &&
      (!existing.inviteExpiresAt || existing.inviteExpiresAt.getTime() <= Date.now());
    if (!expired) {
      return NextResponse.json({ error: 'Member already invited' }, { status: 409 });
    }
    // Expired pending invite: rotate the token and resend (seat already held).
    const rotated = await TeamMember.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt, role, invitedAt: new Date() } },
      { new: true },
    );
    if (!rotated) return NextResponse.json({ error: 'Member already invited' }, { status: 409 });
    member = rotated;
  } else {
    if ((await TeamMember.countDocuments({ ownerUserId })) >= maxInvitees) {
      return NextResponse.json({ error: 'Team member limit reached' }, { status: 403 });
    }
    try {
      member = await TeamMember.create({
        ownerUserId,
        email,
        role,
        status: 'pending',
        inviteTokenHash: tokenHash,
        inviteExpiresAt: expiresAt,
      });
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
        return NextResponse.json({ error: 'Member already invited' }, { status: 409 });
      }
      throw err;
    }
    // Race-safe seat check: the pre-check above can be passed by concurrent
    // requests, so re-count after inserting and give the seat back if over.
    if ((await TeamMember.countDocuments({ ownerUserId })) > maxInvitees) {
      await TeamMember.deleteOne({ _id: member._id, ownerUserId });
      return NextResponse.json({ error: 'Team member limit reached' }, { status: 403 });
    }
  }

  const acceptUrl = `${getAppUrl()}/dashboard/team/accept?token=${encodeURIComponent(token)}`;
  await sendTeamInviteEmail(email, {
    inviterName: session.user.name ?? session.user.email,
    role,
    acceptUrl,
    expiresInDays: Math.round(INVITE_TTL_MS / 86_400_000),
  });

  return NextResponse.json({
    member: {
      _id: String(member._id),
      email: member.email,
      role: member.role,
      status: member.status,
      invitedAt: member.invitedAt.toISOString(),
    },
  });
}
