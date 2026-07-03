import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import {
  applyCdnValidationRecords,
  exchangeCloudflareOAuthCode,
  getCloudflareConfig,
  getCloudflareOAuthConfig,
} from '@uploadkitdev/cloudflare';
import {
  getCloudflareOAuthRedirectUri,
  parseCloudflareOAuthState,
} from '../../../../../../lib/cloudflare-oauth-state';

export const dynamic = 'force-dynamic';

function settingsUrl(slug: string, query: Record<string, string>): string {
  const base = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const url = new URL(`${base.replace(/\/$/, '')}/dashboard/projects/${slug}/settings`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const code = req.nextUrl.searchParams.get('code');
  const stateToken = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');

  if (oauthError) {
    const slug = req.nextUrl.searchParams.get('slug') ?? '';
    const redirect = slug
      ? settingsUrl(slug, { cf_dns: 'denied' })
      : new URL('/dashboard', req.url).toString();
    return NextResponse.redirect(redirect);
  }

  if (!code || !stateToken) {
    return NextResponse.json({ error: 'Missing OAuth code or state' }, { status: 400 });
  }

  let state;
  try {
    state = parseCloudflareOAuthState(stateToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid state';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (state.userId !== session.user.id) {
    return NextResponse.json({ error: 'OAuth state does not match current user' }, { status: 403 });
  }

  const oauthConfig = getCloudflareOAuthConfig();
  const cfConfig = getCloudflareConfig();
  if (!oauthConfig || !cfConfig) {
    return NextResponse.redirect(settingsUrl(state.slug, { cf_dns: 'misconfigured' }));
  }

  await connectDB();
  const project = await Project.findOne({ slug: state.slug, userId: session.user.id });
  if (!project || project.customCdnDomain?.toLowerCase() !== state.domain) {
    return NextResponse.redirect(settingsUrl(state.slug, { cf_dns: 'project_mismatch' }));
  }

  const records = project.customCdnValidationRecords.length > 0
    ? project.customCdnValidationRecords
    : [{ type: 'cname' as const, name: state.domain, value: cfConfig.cnameTarget }];

  try {
    const redirectUri = getCloudflareOAuthRedirectUri();
    const tokens = await exchangeCloudflareOAuthCode(oauthConfig, code, redirectUri);
    await applyCdnValidationRecords(tokens.accessToken, state.domain, records);
    return NextResponse.redirect(settingsUrl(state.slug, { cf_dns: 'success' }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to configure DNS';
    return NextResponse.redirect(
      settingsUrl(state.slug, { cf_dns: 'error', cf_dns_msg: message.slice(0, 180) }),
    );
  }
}
