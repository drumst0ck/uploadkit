import { redirect } from 'next/navigation';
import { auth, signOut } from '../../../auth';
import { connectDB } from '@uploadkit/db';

// Force dynamic rendering — this layout calls auth() and connectDB() which
// require runtime env vars (MONGODB_URI, AUTH_SECRET) unavailable at build time.
export const dynamic = 'force-dynamic';

// Sign-out server action — CSRF-safe via Next.js server actions (T-02-11)
async function handleSignOut() {
  'use server';
  await signOut({ redirectTo: '/login' });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: ensure DB connection before auth() to prevent cold-start ordering issues
  await connectDB();
  const session = await auth();

  // Belt-and-suspenders: proxy.ts handles the redirect at the Edge, but
  // this layout guard catches any edge cases (T-02-10, D-08)
  if (!session?.user) redirect('/login');

  const { user } = session;
  // Display initials as fallback when no avatar image is available
  const initials = (user.name ?? user.email ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Top navigation bar — Phase 6 will expand this into a full sidebar chrome */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <span className="text-lg font-semibold text-white">UploadKit</span>

        <div className="flex items-center gap-3">
          {/* User avatar or initials circle */}
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? 'User avatar'}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/30"
              aria-hidden="true"
            >
              {initials}
            </div>
          )}

          {/* User email — only expose non-sensitive fields (T-02-10) */}
          {user.email && (
            <span className="hidden text-sm text-zinc-400 sm:block">
              {user.email}
            </span>
          )}

          {/* Sign-out form — server action prevents CSRF (T-02-11) */}
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
