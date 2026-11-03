import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { connectDB, TeamMember } from '@uploadkitdev/db';
import { hashInviteToken } from '../../../../../lib/team-invites';

export const dynamic = 'force-dynamic';

// POST /api/internal/team/accept  { token }
// The signed-in user's email must match the invited email.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token === 'string') token = body.token;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!token || token.length > 200) {
    return NextResponse.json({ error: 'Invitation token required' }, { status: 400 });
  }

  await connectDB();
  const tokenHash = hashInviteToken(token);
  const invite = await TeamMember.findOne({ inviteTokenHash: tokenHash, status: 'pending' });
  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
  }
  if (!invite.inviteExpiresAt || invite.inviteExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }
  if (invite.email.trim().toLowerCase() !== session.user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address' },
      { status: 403 },
    );
  }

  // Atomic: only one concurrent accept can flip pending -> active.
  const accepted = await TeamMember.findOneAndUpdate(
    { _id: invite._id, status: 'pending', inviteTokenHash: tokenHash, inviteExpiresAt: { $gt: new Date() } },
    {
      $set: { status: 'active', memberUserId: session.user.id, acceptedAt: new Date() },
      $unset: { inviteTokenHash: '', inviteExpiresAt: '' },
    },
    { new: true },
  );
  if (!accepted) {
    return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, role: accepted.role });
}
