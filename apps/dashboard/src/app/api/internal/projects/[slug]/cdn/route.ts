import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { getCloudflareConfig, isCloudflareCdnConfigured } from '@uploadkitdev/cloudflare';
import { getUserTier } from '../../../../../../lib/tier';
import { tierHasFeature } from '@uploadkitdev/shared';
import {
  applyCustomHostnameToProject,
  clearCustomHostnameFields,
  persistCustomHostnameState,
  removeProjectCustomHostname,
} from '../../../../../../lib/custom-cdn';

export const dynamic = 'force-dynamic';

function serializeCdn(project: {
  customCdnDomain?: string;
  customCdnVerified: boolean;
  customCdnStatus: string;
  customCdnValidationRecords: Array<{ type: string; name: string; value: string }>;
  customCdnLastError?: string;
  customCdnVerifiedAt?: Date;
}) {
  const config = getCloudflareConfig();
  return {
    customCdnDomain: project.customCdnDomain,
    verified: project.customCdnVerified,
    status: project.customCdnStatus,
    validationRecords: project.customCdnValidationRecords,
    lastError: project.customCdnLastError,
    verifiedAt: project.customCdnVerifiedAt?.toISOString(),
    fallbackOrigin: config?.fallbackOrigin ?? null,
    cloudflareConfigured: isCloudflareCdnConfigured(),
  };
}

export async function GET(
  _req: NextRequest,
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

  return NextResponse.json(serializeCdn(project));
}

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

  if (!isCloudflareCdnConfigured()) {
    return NextResponse.json(
      { error: 'Custom CDN is not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.' },
      { status: 503 },
    );
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
      ? (body as { customCdnDomain: string | null }).customCdnDomain?.trim().toLowerCase() || undefined
      : undefined;

  if (domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    if (!domain) {
      await removeProjectCustomHostname(project);
      clearCustomHostnameFields(project);
      await project.save();
      return NextResponse.json(serializeCdn(project));
    }

    const state = await applyCustomHostnameToProject(project, domain);
    persistCustomHostnameState(project, state, domain);
    await project.save();

    return NextResponse.json(serializeCdn(project));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register custom hostname';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
