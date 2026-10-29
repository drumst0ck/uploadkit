import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '../../../../../../../../auth';
import { connectDB, Project, UploadRejection } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// PATCH /api/internal/projects/[slug]/rejected/[id]
// Dismisses one rejection (sets dismissedAt). Only rows of the owner's project match.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, id } = await params;
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).select('_id').lean();
  if (!project || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // projectId in the filter: an id from another project never matches
  const updated = await UploadRejection.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), projectId: project._id },
    { $set: { dismissedAt: new Date() } },
    { projection: { _id: 1 } },
  ).lean();
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ dismissed: true });
}
