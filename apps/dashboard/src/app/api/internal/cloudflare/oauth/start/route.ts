import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import {
  buildCloudflareAuthorizationUrl,
  getCloudflareOAuthConfig,
  isCloudflareOAuthConfigured,
} from '@uploadkitdev/cloudflare';
import {
  createCloudflareOAuthState,
  getAppOriginFromRequest,
  getCloudflareOAuthRedirectUri,
} from '../../../../../../lib/cloudflare-oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudflareOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Cloudflare OAuth is not configured on this server.' },
      { status: 503 },
    );
  }

  const slug = req.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  await connectDB();
  const project = await Project.findOne({ slug, userId: session.user.id });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const domain = project.customCdnDomain?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: 'Save a custom CDN domain first.' }, { status: 400 });
  }

  const config = getCloudflareOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: 'Cloudflare OAuth is not configured.' }, { status: 503 });
  }

  const origin = getAppOriginFromRequest(req);
  const redirectUri = getCloudflareOAuthRedirectUri(origin);
  const state = createCloudflareOAuthState({
    userId: session.user.id,
    slug,
    domain,
    origin,
  });

  const authUrl = buildCloudflareAuthorizationUrl(config, redirectUri, state);

  return NextResponse.redirect(authUrl);
}
