// auth.ts lives at the dashboard root (apps/dashboard/auth.ts).
// The @/ alias maps to ./src/, so we use a relative path here.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handlers } from '../../../../../auth';

const { GET: authGet, POST } = handlers;

// Workaround for oauth4webapi@3.8.5 strict `iss` validation in the GitHub
// OAuth callback. An `iss` query param reaches the callback URL (whether
// from GitHub's RFC 9207 rollout, a proxy, or GitHub App config) and
// oauth4webapi compares it against `as.issuer` — Auth.js falls back to
// "https://authjs.dev" for non-OIDC providers, so the comparison fails.
//
// Strategy: if `iss` is present on the GitHub callback, do an internal
// 307 redirect to the same URL without it. The browser re-requests and
// our handler passes it clean to Auth.js. State cookies survive the
// redirect (same origin, same path).
const GET = async (req: NextRequest): Promise<Response> => {
  const url = new URL(req.url);

  if (
    url.pathname.includes('/callback/github') &&
    url.searchParams.has('iss')
  ) {
    console.log('[auth-debug] stripping iss from github callback:', {
      iss: url.searchParams.get('iss'),
      allParams: Object.fromEntries(url.searchParams.entries()),
    });
    url.searchParams.delete('iss');
    return NextResponse.redirect(url.toString(), 307);
  }

  return authGet(req);
};

export { GET, POST };
