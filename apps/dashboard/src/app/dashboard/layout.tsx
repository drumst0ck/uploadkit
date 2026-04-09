import { redirect } from 'next/navigation';
import { auth, signOut } from '../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { SidebarProvider } from '../../components/layout/sidebar';
import { MobileMenuWrapper } from '../../components/layout/mobile-menu-wrapper';

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

  // Prefetch projects server-side to avoid loading flash in ProjectSwitcher
  const rawProjects = await Project.find({ userId: user.id })
    .select('name slug')
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  const projects = rawProjects.map((p) => ({
    _id: String(p._id),
    name: p.name,
    slug: p.slug,
  }));

  return (
    <SidebarProvider>
      <MobileMenuWrapper
        user={user}
        onSignOut={handleSignOut}
        initialProjects={projects}
      >
        {children}
      </MobileMenuWrapper>
    </SidebarProvider>
  );
}
