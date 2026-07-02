import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB } from '@uploadkitdev/db';
import { isAdminSession } from '../../../lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connectDB();
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isAdminSession(session)) redirect('/dashboard');

  return <>{children}</>;
}
