import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { isCloudflareCdnConfigured } from '@uploadkitdev/cloudflare';
import {
  persistCustomHostnameState,
  syncProjectCustomHostname,
} from '../../../../../../../lib/custom-cdn';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudflareCdnConfigured()) {
    return NextResponse.json({ error: 'Cloudflare CDN not configured' }, { status: 503 });
  }

  const { slug } = await params;
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!project.customCdnHostnameId) {
    return NextResponse.json({ error: 'No custom hostname registered' }, { status: 400 });
  }

  try {
    const state = await syncProjectCustomHostname(project);
    if (!state) {
      return NextResponse.json({ error: 'Unable to sync hostname' }, { status: 502 });
    }

    persistCustomHostnameState(project, state);
    await project.save();

    return NextResponse.json({
      verified: project.customCdnVerified,
      status: project.customCdnStatus,
      validationRecords: project.customCdnValidationRecords,
      lastError: project.customCdnLastError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
