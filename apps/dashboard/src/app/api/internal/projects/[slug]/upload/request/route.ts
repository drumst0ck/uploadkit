export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, File, Subscription, UsageRecord } from '@uploadkitdev/db';
import { TIER_LIMITS, type Tier } from '@uploadkitdev/shared';
import { auth } from '../../../../../../../../auth';
import { Project } from '@uploadkitdev/db';
import { generatePresignedPutUrl } from '@/lib/presign';
import { CDN_URL } from '@/lib/storage';

const UploadRequestBody = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // 1. Session auth guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // 2. Scope project lookup by userId (T-06-10)
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = UploadRequestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { fileName, fileSize, contentType, metadata } = parsed.data;

  // 4. Resolve tier via Subscription
  const subscription = await Subscription.findOne({ userId: session.user.id }).lean();
  const tier: Tier = (subscription?.tier as Tier | undefined) ?? 'FREE';
  const tierLimits = TIER_LIMITS[tier];

  // 5. Enforce file size against tier limit
  if (fileSize > tierLimits.maxFileSizeBytes) {
    return NextResponse.json(
      { error: 'File size exceeds tier limit', limit: tierLimits.maxFileSizeBytes },
      { status: 413 },
    );
  }

  // 6. Enforce storage + upload count quotas (FREE hard-block, paid soft-limit)
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

  // 7. Generate key: {projectId}/dashboard/{nanoid}/{safeName}
  const safeName = fileName.replace(/\.\.\//g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
  const key = `${project._id.toString()}/dashboard/${nanoid()}/${safeName}`;

  // 8. Presigned PUT URL (ContentType+Length locked)
  const uploadUrl = await generatePresignedPutUrl({
    key,
    contentType,
    contentLength: fileSize,
    expiresIn: 900,
  });

  // 9. Create File record in UPLOADING
  const file = await File.create({
    key,
    name: fileName,
    size: fileSize,
    type: contentType,
    url: `${CDN_URL}/${key}`,
    status: 'UPLOADING',
    projectId: project._id,
    ...(metadata !== undefined ? { metadata } : {}),
  });

  return NextResponse.json({
    fileId: file._id.toString(),
    uploadUrl,
    key,
    cdnUrl: file.url,
  });
}
