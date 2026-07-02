import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { connectDB, TeamMember } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const result = await TeamMember.deleteOne({ _id: id, ownerUserId: session.user.id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
