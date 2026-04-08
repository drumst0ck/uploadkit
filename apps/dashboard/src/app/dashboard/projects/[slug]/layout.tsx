import { redirect, notFound } from 'next/navigation';
import { auth } from '../../../../../auth';
import { connectDB, Project } from '@uploadkit/db';

export const dynamic = 'force-dynamic';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();

  // T-06-06: always scope project lookup with userId to prevent cross-user slug access
  const project = await Project.findOne({
    slug,
    userId: session.user.id,
  }).lean();

  if (!project) {
    // Slug doesn't exist or belongs to another user — treat as 404
    notFound();
  }

  // The project sub-layout renders children directly.
  // Nested pages (files, keys, routes, logs) each fetch the project independently
  // via their own server-side auth() + Project.findOne calls.
  // The sidebar SidebarNav already handles project-scoped nav items via pathname detection.
  return <>{children}</>;
}
