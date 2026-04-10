import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    // GitHub sends `iss=https://github.com/login/oauth` in the callback
    // (RFC 9207). Without matching the provider's `issuer`, oauth4webapi
    // rejects the callback because Auth.js falls back to "https://authjs.dev".
    GitHub({ issuer: 'https://github.com/login/oauth' }),
    Google,
    Resend({
      from: 'UploadKit <noreply@updates.uploadkit.dev>',
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        return isLoggedIn; // unauthenticated -> redirect to /login (per D-08)
      }
      return true; // all other routes are public
    },
  },
} satisfies NextAuthConfig;
