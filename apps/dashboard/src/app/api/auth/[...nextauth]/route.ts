// auth.ts lives at the dashboard root (apps/dashboard/auth.ts).
// The @/ alias maps to ./src/, so we use a relative path here.
import { handlers } from '../../../../../auth';

const { GET: authGet, POST } = handlers;

// Workaround for oauth4webapi@3.8.5 strict `iss` validation in the GitHub
// OAuth callback. Some environments (proxies, GitHub App configs, or
// RFC 9207 rollout) cause an `iss` query param to reach the callback URL
// which oauth4webapi then compares against `as.issuer` — and since
// Auth.js v5 falls back to "https://authjs.dev" for non-OIDC providers,
// the comparison always fails.
//
// Strategy: log the full callback URL for diagnosis, then strip `iss`
// before passing the request to Auth.js. The state CSRF check runs
// unchanged because we don't touch that param.
const GET = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname.includes('/callback/github')) {
    // Diagnostic log — visible in Coolify container logs
    console.log('[auth-debug] github callback URL:', url.toString());
    console.log(
      '[auth-debug] github callback params:',
      Object.fromEntries(url.searchParams.entries()),
    );

    if (url.searchParams.has('iss')) {
      const issValue = url.searchParams.get('iss');
      console.log('[auth-debug] stripping iss param, value was:', issValue);
      url.searchParams.delete('iss');
      return authGet(new Request(url.toString(), req));
    }
  }

  return authGet(req);
};

export { GET, POST };
