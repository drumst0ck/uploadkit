import type { NextAuthConfig } from 'next-auth';
import type { GitHubProfile } from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    {
      id: 'github',
      name: 'GitHub',
      type: 'oauth',
      issuer: 'https://github.com',
      authorization: 'https://github.com/login/oauth/authorize',
      token: 'https://github.com/login/oauth/access_token',
      userinfo: 'https://api.github.com/user',
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      checks: ['state'],
      profile(profile: GitHubProfile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    },
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
