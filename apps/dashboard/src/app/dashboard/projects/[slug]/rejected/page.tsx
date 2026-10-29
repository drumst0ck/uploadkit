import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { RejectedUploads } from '../../../../../components/rejected/rejected-uploads';

export const dynamic = 'force-dynamic';

interface RejectedPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RejectedPage({ params }: RejectedPageProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).select('name slug').lean();
  if (!project) notFound();

  return <RejectedUploads slug={slug} projectName={project.name} />;
}
