import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Project } from '@uploadkitdev/db';
import {
  getCloudflareConfig,
  getCustomHostname,
  isCloudflareCdnConfigured,
} from '@uploadkitdev/cloudflare';

export const dynamic = 'force-dynamic';

function applyStateToProject(
  project: NonNullable<Awaited<ReturnType<typeof Project.findOne>>>,
  state: Awaited<ReturnType<typeof getCustomHostname>>,
) {
  project.customCdnStatus = state.status;
  project.customCdnValidationRecords = state.validationRecords;
  if (state.error !== undefined) {
    project.customCdnLastError = state.error;
  } else {
    void project.set('customCdnLastError', undefined, { strict: false });
  }
  project.customCdnVerified = state.status === 'active';
  if (state.status === 'active') {
    project.customCdnVerifiedAt = new Date();
  } else {
    void project.set('customCdnVerifiedAt', undefined, { strict: false });
  }
}

/**
 * GET /api/cron/cdn-verify
 * Polls Cloudflare for pending custom hostnames. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const xCronSecret = req.headers.get('x-cron-secret');
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!cronSecret || (xCronSecret !== cronSecret && bearerToken !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudflareCdnConfigured()) {
    return NextResponse.json({ ok: true, synced: 0, message: 'Cloudflare not configured' });
  }

  const config = getCloudflareConfig()!;
  await connectDB();

  const pending = await Project.find({
    customCdnHostnameId: { $exists: true, $ne: null },
    customCdnStatus: { $in: ['pending', 'pending_validation'] },
  });

  let synced = 0;
  let activated = 0;

  for (const project of pending) {
    if (!project.customCdnHostnameId) continue;
    try {
      const state = await getCustomHostname(config, project.customCdnHostnameId);
      applyStateToProject(project, state);
      await project.save();
      synced++;
      if (state.status === 'active') activated++;
    } catch (err) {
      project.customCdnStatus = 'failed';
      project.customCdnLastError = err instanceof Error ? err.message : 'Sync failed';
      await project.save();
    }
  }

  return NextResponse.json({ ok: true, synced, activated });
}
