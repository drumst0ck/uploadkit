import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { auth } from '../../../../../auth';
import { connectDB, TeamMember } from '@uploadkitdev/db';
import { getUserTier } from '../../../../lib/tier';
import { getTeamMemberLimit } from '@uploadkitdev/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const members = await TeamMember.find({ ownerUserId: session.user.id })
    .sort({ createdAt: 1 })
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

  const count = await TeamMember.countDocuments({ ownerUserId: session.user.id });
  if (count >= limit) {
    return NextResponse.json({ error: 'Team member limit reached' }, { status: 403 });
  }

  const existing = await TeamMember.findOne({ ownerUserId: session.user.id, email });
  if (existing) {
    return NextResponse.json({ error: 'Member already invited' }, { status: 409 });
  }

  const member = await TeamMember.create({
    ownerUserId: session.user.id,
    email,
    role,
    status: 'pending',
    inviteToken: randomBytes(24).toString('hex'),
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
