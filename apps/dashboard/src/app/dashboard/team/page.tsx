import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB, TeamMember } from '@uploadkitdev/db';
import { TeamMembersPanel } from '../../../components/team-members-panel';
import { getUserTier } from '../../../lib/tier';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();
  const tier = await getUserTier(session.user.id);

  const members = await TeamMember.find({ ownerUserId: session.user.id })
    .sort({ createdAt: 1 })
    .lean();

  const initialMembers = [
    {
      _id: 'owner',
      email: session.user.email ?? 'you@example.com',
      role: 'admin' as const,
      status: 'active' as const,
      invitedAt: new Date().toISOString(),
    },
    ...members.map((m) => ({
      _id: String(m._id),
      email: m.email,
      role: m.role,
      status: m.status,
      invitedAt: m.invitedAt.toISOString(),
    })),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite collaborators to manage projects on your account.
        </p>
      </div>

      <TeamMembersPanel tier={tier} initialMembers={initialMembers} />
    </div>
  );
}
