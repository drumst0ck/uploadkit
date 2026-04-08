import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// CRITICAL: Import ONLY from auth.config.ts — never from auth.ts.
// Importing auth.ts would pull @auth/mongodb-adapter (and mongodb's net/tls modules)
// into the Edge runtime and crash the proxy build (Pitfall 2 from RESEARCH.md).
export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Match all routes except static assets and API routes.
    // The authorized() callback in auth.config.ts enforces /dashboard/* protection.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
