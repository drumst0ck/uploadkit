import { redirect, notFound } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Project } from '@uploadkit/db';
import { ProjectSettingsForm } from '../../../../../components/project-settings-form';

export const dynamic = 'force-dynamic';

interface ProjectSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  // T-06-17: scope lookup to userId — prevents cross-user access
  const project = await Project.findOne({ slug, userId: session.user.id })
    .select('name slug')
    .lean();

  if (!project) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Project Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage settings for <span className="text-zinc-300">{project.name}</span>.
        </p>
      </div>

      <ProjectSettingsForm
        initialName={project.name}
        slug={project.slug}
      />
    </div>
  );
}
