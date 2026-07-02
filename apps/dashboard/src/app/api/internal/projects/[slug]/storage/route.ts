import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, encryptSecret } from '@uploadkitdev/db';
import type { StorageMode } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

// PUT /api/internal/projects/[slug]/storage
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();
  const project = await Project.findOne({ slug, userId: session.user.id });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { storageMode, byosConfig } = body as {
    storageMode?: StorageMode;
    byosConfig?: {
      provider: string;
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey?: string;
      publicUrl?: string;
    } | null;
  };

  if (storageMode && !['managed', 'byos'].includes(storageMode)) {
    return NextResponse.json({ error: 'Invalid storage mode' }, { status: 400 });
  }

  if (storageMode) project.storageMode = storageMode;

  if (storageMode === 'managed') {
    void project.set('byosConfig', undefined, { strict: false });
  } else if (byosConfig) {
    const existingSecret = project.byosConfig?.secretAccessKeyEncrypted;
    const secret = byosConfig.secretAccessKey;

    if (!secret && !existingSecret) {
      return NextResponse.json({ error: 'Secret access key is required for BYOS' }, { status: 400 });
    }

    const nextConfig: NonNullable<typeof project.byosConfig> = {
      provider: (byosConfig.provider as 'r2' | 's3' | 'minio' | 'other') ?? 'r2',
      region: byosConfig.region,
      bucket: byosConfig.bucket,
      accessKeyId: byosConfig.accessKeyId,
      secretAccessKeyEncrypted: secret ? encryptSecret(secret) : existingSecret!,
    };
    if (byosConfig.endpoint) nextConfig.endpoint = byosConfig.endpoint;
    if (byosConfig.publicUrl) nextConfig.publicUrl = byosConfig.publicUrl;
    project.byosConfig = nextConfig;
  }

  await project.save();

  return NextResponse.json({
    message: 'Storage settings saved.',
    storageMode: project.storageMode,
    hasByosConfig: Boolean(project.byosConfig),
  });
}
