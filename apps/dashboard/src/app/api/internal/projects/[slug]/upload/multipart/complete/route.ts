export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB, File, Project, UsageRecord } from '@uploadkitdev/db';
import { auth } from '../../../../../../../../../auth';
import { r2Client, R2_BUCKET } from '@/lib/storage';

const MultipartCompleteBody = z.object({
  fileId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
      }),
    )
    .min(1),
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
  const parsed = MultipartCompleteBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }
  const { fileId, uploadId, parts } = parsed.data;

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
    new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: file.key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );

  const updatedFile = await File.findByIdAndUpdate(
    file._id,
    { $set: { status: 'UPLOADED', uploadId: null } },
    { new: true },
  );
  if (!updatedFile) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

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
      url: updatedFile.url,
      status: updatedFile.status,
      metadata: updatedFile.metadata,
      createdAt: updatedFile.createdAt,
    },
  });
}
