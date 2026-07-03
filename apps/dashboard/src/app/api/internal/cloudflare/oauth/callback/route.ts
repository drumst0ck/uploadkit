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
  getAppOriginFromRequest,
  getCloudflareOAuthRedirectUri,
  getProjectSettingsUrl,
  parseCloudflareOAuthState,
} from '../../../../../../lib/cloudflare-oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = getAppOriginFromRequest(req);
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const code = req.nextUrl.searchParams.get('code');
  const stateToken = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  const oauthErrorDescription = req.nextUrl.searchParams.get('error_description');

  if (oauthError) {
    let slug = '';
    if (stateToken) {
      try {
        slug = parseCloudflareOAuthState(stateToken).slug;
      } catch {
        // ignore invalid state on denied flow
      }
    }
    const wasDenied = oauthError === 'access_denied';
    const message = oauthErrorDescription?.trim() || `Cloudflare OAuth error: ${oauthError}`;
    console.error('Cloudflare OAuth authorization failed', {
      error: oauthError,
      description: oauthErrorDescription,
      slug: slug || undefined,
    });
    const redirect = slug
      ? getProjectSettingsUrl(origin, slug, {
          cf_dns: wasDenied ? 'denied' : 'oauth_error',
          ...(!wasDenied ? { cf_dns_msg: message.slice(0, 180) } : {}),
        })
      : new URL('/dashboard', origin).toString();
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
    return NextResponse.redirect(getProjectSettingsUrl(origin, state.slug, { cf_dns: 'misconfigured' }));
  }

  await connectDB();
  const project = await Project.findOne({ slug: state.slug, userId: session.user.id });
  if (!project || project.customCdnDomain?.toLowerCase() !== state.domain) {
    return NextResponse.redirect(getProjectSettingsUrl(origin, state.slug, { cf_dns: 'project_mismatch' }));
  }

  const records = project.customCdnValidationRecords.length > 0
    ? project.customCdnValidationRecords
    : [{ type: 'cname' as const, name: state.domain, value: cfConfig.cnameTarget }];

  try {
    const redirectUri = getCloudflareOAuthRedirectUri(state.origin);
    const tokens = await exchangeCloudflareOAuthCode(oauthConfig, code, redirectUri);
    await applyCdnValidationRecords(tokens.accessToken, state.domain, records);
    return NextResponse.redirect(getProjectSettingsUrl(origin, state.slug, { cf_dns: 'success' }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to configure DNS';
    return NextResponse.redirect(
      getProjectSettingsUrl(origin, state.slug, {
        cf_dns: 'error',
        cf_dns_msg: message.slice(0, 180),
      }),
    );
  }
}
