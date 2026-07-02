import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { getUserTier } from '../../../../../../lib/tier';
import { tierHasFeature } from '@uploadkitdev/shared';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierHasFeature(tier, 'customCdnDomain')) {
    return NextResponse.json({ error: 'Custom CDN domain requires Pro plan or higher' }, { status: 403 });
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

  const domain =
    typeof body === 'object' &&
    body !== null &&
    'customCdnDomain' in body &&
    (body.customCdnDomain === null || typeof (body as { customCdnDomain: unknown }).customCdnDomain === 'string')
      ? (body as { customCdnDomain: string | null }).customCdnDomain?.trim() || undefined
      : undefined;

  if (domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  if (domain) {
    project.customCdnDomain = domain;
  } else {
    void project.set('customCdnDomain', undefined, { strict: false });
  }
  project.customCdnVerified = false;
  await project.save();

  return NextResponse.json({ customCdnDomain: project.customCdnDomain, verified: false });
}
