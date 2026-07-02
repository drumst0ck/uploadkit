import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../../auth';
import { connectDB, Project, decryptSecret } from '@uploadkitdev/db';

export const dynamic = 'force-dynamic';

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

  const cfg = body as {
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

  const secret =
    cfg.secretAccessKey ??
    (project.byosConfig?.secretAccessKeyEncrypted
      ? decryptSecret(project.byosConfig.secretAccessKeyEncrypted)
      : undefined);

  if (!cfg.bucket || !cfg.accessKeyId || !secret) {
    return NextResponse.json({ error: 'Missing bucket, access key, or secret' }, { status: 400 });
  }

  const { HeadBucketCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: cfg.region ?? 'auto',
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: secret,
    },
    forcePathStyle: true,
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bucket unreachable';
    return NextResponse.json({ error: message, ok: false }, { status: 400 });
  }
}
