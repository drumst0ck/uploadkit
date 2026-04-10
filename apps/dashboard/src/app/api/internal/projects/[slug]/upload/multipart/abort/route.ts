export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB, File, Project } from '@uploadkitdev/db';
import { auth } from '../../../../../../../../../auth';
import { r2Client, R2_BUCKET } from '@/lib/storage';

const MultipartAbortBody = z.object({
  fileId: z.string().min(1),
  uploadId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = MultipartAbortBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }
  const { fileId, uploadId } = parsed.data;

  if (!mongoose.isValidObjectId(fileId)) {
    return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 });
  }

  const file = await File.findOne({
    _id: fileId,
    projectId: project._id,
    status: 'UPLOADING',
    uploadId,
  });
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  await r2Client.send(
    new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: file.key,
      UploadId: uploadId,
    }),
  );

  await File.deleteOne({ _id: file._id });

  return NextResponse.json({ ok: true });
}
