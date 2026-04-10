// auth.ts lives at the dashboard root (apps/dashboard/auth.ts).
// The @/ alias maps to ./src/, so we use a relative path here.
import { handlers } from '../../../../../auth';

const { GET: authGet, POST } = handlers;

// Workaround: strip `iss` param from GitHub OAuth callback before Auth.js
// validates it. GitHub sends an `iss` value that oauth4webapi (used by
// next-auth@5.0.0-beta.30) rejects because it doesn't match the expected
// provider issuer. Removing it bypasses the validation safely — the state
// CSRF check still runs, and the token exchange still authenticates the user.
const GET = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/callback/github') && url.searchParams.has('iss')) {
    url.searchParams.delete('iss');
    return authGet(new Request(url.toString(), req));
  }
  return authGet(req);
};

export { GET, POST };
