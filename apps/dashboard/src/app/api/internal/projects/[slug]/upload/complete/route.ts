export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { HeadObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB, File, Project, UsageRecord } from '@uploadkitdev/db';
import { auth } from '../../../../../../../../auth';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { withSignedUrl } from '@/lib/cdn-access';

const UploadCompleteBody = z.object({
  fileId: z.string().min(1),
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
  const parsed = UploadCompleteBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }
  const { fileId } = parsed.data;

  if (!mongoose.isValidObjectId(fileId)) {
    return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 });
  }

  // Look up file (must belong to project and be UPLOADING)
  const file = await File.findOne({
    _id: fileId,
    projectId: project._id,
    status: 'UPLOADING',
  });
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Verify upload landed in R2 — catch both 403 and 404 (Pitfall 4)
  let head: { ContentLength?: number | undefined };
  try {
    head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: file.key }));
  } catch (err) {
    if (
      err instanceof S3ServiceException &&
      (err.$response?.statusCode === 404 || err.$response?.statusCode === 403)
    ) {
      return NextResponse.json(
        { error: 'File not found in storage. Upload may not have completed.' },
        { status: 422 },
      );
    }
    throw err;
  }

  // The presigned PUT locks Content-Length, but confirm the stored size anyway
  // so quota accounting always matches what is really in the bucket.
  if (typeof head.ContentLength === 'number' && head.ContentLength !== file.size) {
    return NextResponse.json(
      { error: 'Stored file size does not match the declared size.' },
      { status: 422 },
    );
  }

  // Flip to UPLOADED atomically: only the request that wins the UPLOADING ->
  // UPLOADED transition counts usage, so concurrent completes cannot double-count.
  const updatedFile = await File.findOneAndUpdate(
    { _id: file._id, projectId: project._id, status: 'UPLOADING' },
    { $set: { status: 'UPLOADED' } },
    { new: true },
  );
  if (!updatedFile) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Atomic usage increment
  const period = new Date().toISOString().slice(0, 7);
  await UsageRecord.findOneAndUpdate(
    { userId: project.userId, period },
    { $inc: { storageUsed: file.size, uploads: 1 } },
    { upsert: true, new: true },
  );

  return NextResponse.json({
    file: {
      id: updatedFile._id,
      key: updatedFile.key,
      name: updatedFile.name,
      size: updatedFile.size,
      type: updatedFile.type,
      url: withSignedUrl(project, { key: updatedFile.key, url: updatedFile.url }).url,
      status: updatedFile.status,
      metadata: updatedFile.metadata,
      createdAt: updatedFile.createdAt,
    },
  });
}
