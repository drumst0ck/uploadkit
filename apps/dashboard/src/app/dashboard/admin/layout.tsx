import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../../auth';
import { connectDB } from '@uploadkitdev/db';
import { isAdminSession } from '../../../lib/admin';

export const dynamic = 'force-dynamic';

const ADMIN_NAV = [
  { label: 'Overview', href: '/dashboard/admin' },
  { label: 'Users', href: '/dashboard/admin/users' },
  { label: 'Files', href: '/dashboard/admin/files' },
  { label: 'Subscriptions', href: '/dashboard/admin/subscriptions' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connectDB();
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isAdminSession(session)) redirect('/dashboard');

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminSubNav />
      {children}
    </div>
  );
}

function AdminSubNav() {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2 scrollbar-none sm:mx-0">
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
          aria-current={
            // We rely on the pathname matching — but since this is a server
            // component rendered per-page, the active state is just a hint.
            // The client-side nav handles visual focus via the link.
            undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}