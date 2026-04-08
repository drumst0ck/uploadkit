import NextAuth, { type NextAuthResult } from 'next-auth';
import type { DefaultSession } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { authConfig } from './auth.config';
import { getAuthMongoClient, connectDB, Project } from '@uploadkit/db';
import { nanoid } from 'nanoid';
import { sendWelcomeEmail } from '@uploadkit/emails';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

// Async lazy factory ensures connectDB() completes before the adapter is
// initialized on every cold start (Pitfall 1 from RESEARCH.md).
const result: NextAuthResult = NextAuth(async () => {
  const client = await getAuthMongoClient();
  return {
    ...authConfig,
    adapter: MongoDBAdapter(client),
    session: {
      strategy: 'database' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days (D-05)
      updateAge: 24 * 60 * 60,   // refresh once per day
    },
    events: {
      async createUser({ user }) {
        // D-07: auto-create default project on first signup
        if (!user.id) return;
        await connectDB();
        // Idempotency guard — skip if a project already exists (Pitfall 4 from RESEARCH.md)
        const existing = await Project.findOne({ userId: user.id as string });
        if (!existing) {
          await Project.create({
            name: 'My First Project',
            slug: `my-first-project-${nanoid(8)}`,
            userId: user.id as string,
          });
        }

        // EMAIL-01: Send welcome email (fire-and-forget, D-08)
        if (user.email) {
          void sendWelcomeEmail(user.email, {
            userName: user.name ?? 'there',
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.uploadkit.dev'}/dashboard`,
          });
        }
      },
    },
    callbacks: {
      ...authConfig.callbacks,
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
      async redirect({ url, baseUrl }) {
        // D-06: after login, redirect to /dashboard
        // Security: only allow same-origin redirects (T-02-03)
        if (url.startsWith(baseUrl)) return url;
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        return `${baseUrl}/dashboard`;
      },
    },
  };
});

export const { handlers, auth, signIn, signOut } = result;
