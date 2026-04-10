export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { nanoid } from 'nanoid';
import { CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, File, Project, Subscription, UsageRecord } from '@uploadkitdev/db';
import { TIER_LIMITS, type Tier } from '@uploadkitdev/shared';
import { auth } from '../../../../../../../../../auth';
import { r2Client, R2_BUCKET, CDN_URL } from '@/lib/storage';

const PART_SIZE = 5 * 1024 * 1024; // 5 MiB
const MIN_MULTIPART_SIZE = 10 * 1024 * 1024; // 10 MiB

const MultipartInitBody = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  const parsed = MultipartInitBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }
  const { fileName, fileSize, contentType, metadata } = parsed.data;

  // Tier
  const subscription = await Subscription.findOne({ userId: session.user.id }).lean();
  const tier: Tier = (subscription?.tier as Tier | undefined) ?? 'FREE';
  const tierLimits = TIER_LIMITS[tier];

  if (fileSize > tierLimits.maxFileSizeBytes) {
    return NextResponse.json(
      { error: 'File size exceeds tier limit', limit: tierLimits.maxFileSizeBytes },
      { status: 413 },
    );
  }

  const period = new Date().toISOString().slice(0, 7);
  const record = await UsageRecord.findOne({ userId: session.user.id, period });
  if ((record?.storageUsed ?? 0) + fileSize > tierLimits.maxStorageBytes) {
    if (tier === 'FREE') {
      return NextResponse.json({ error: 'Storage quota exceeded' }, { status: 413 });
    }
  }
  if ((record?.uploads ?? 0) >= tierLimits.maxUploadsPerMonth) {
    if (tier === 'FREE') {
      return NextResponse.json({ error: 'Monthly upload quota exceeded' }, { status: 413 });
    }
  }

  if (fileSize <= MIN_MULTIPART_SIZE) {
    return NextResponse.json(
      {
        error: 'File too small for multipart upload',
        suggestion: 'Use /upload/request for files under 10 MiB',
      },
      { status: 400 },
    );
  }

  const safeName = fileName.replace(/\.\.\//g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
  const key = `${project._id.toString()}/dashboard/${nanoid()}/${safeName}`;
  const partCount = Math.ceil(fileSize / PART_SIZE);

  const { UploadId } = await r2Client.send(
    new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!UploadId) {
    throw new Error('R2 did not return an UploadId for multipart upload');
  }

  const parts: Array<{ partNumber: number; uploadUrl: string }> = [];
  for (let partNumber = 1; partNumber <= partCount; partNumber++) {
    const uploadUrl = await getSignedUrl(
      r2Client,
      new UploadPartCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: 3600 },
    );
    parts.push({ partNumber, uploadUrl });
  }

  const file = await File.create({
    key,
    name: fileName,
    size: fileSize,
    type: contentType,
    url: `${CDN_URL}/${key}`,
    status: 'UPLOADING',
    uploadId: UploadId,
    projectId: project._id,
    ...(metadata !== undefined ? { metadata } : {}),
  });

  return NextResponse.json({
    fileId: file._id.toString(),
    uploadId: UploadId,
    key,
    parts,
  });
}
