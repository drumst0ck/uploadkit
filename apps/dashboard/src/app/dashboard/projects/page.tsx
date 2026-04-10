import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderOpen } from 'lucide-react';
import { auth } from '../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { Button } from '@uploadkitdev/ui';
import { CreateProjectDialog } from '../../../components/create-project-dialog';
import { BlurText } from '../../../components/react-bits/blur-text';
import { StaggerList } from '../../../components/react-bits/stagger-list';
import { formatDate } from '../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();

  const projects = await Project.find({ userId: session.user.id })
    .sort({ _id: -1 })
    .lean();

  // If user has exactly 1 project, redirect directly to it
  // Only redirect when navigating from sidebar — not when user explicitly visits /projects
  // Removed: auto-redirect prevented users from seeing the project list and creating new projects

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <BlurText
            as="h1"
            text="Projects"
            delay={60}
            animateBy="letters"
            direction="top"
            className="text-2xl font-semibold tracking-tight text-foreground"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your upload projects and API keys.
          </p>
        </div>
        <CreateProjectDialog>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-foreground gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New project
          </Button>
        </CreateProjectDialog>
      </div>

      {projects.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <div className="mb-4 inline-flex"><FolderOpen className="h-10 w-10 text-muted-foreground drop-shadow-[0_0_8px_rgba(99,102,241,0.15)]" aria-hidden="true" /></div>
          <h2 className="text-lg font-medium text-foreground mb-2">
            No projects yet
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first project to start uploading files.
          </p>
          <CreateProjectDialog>
            <Button className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first project
            </Button>
          </CreateProjectDialog>
        </div>
      ) : (
        <StaggerList
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.06}
          duration={0.4}
        >
          {projects.map((project) => (
            <Link
              key={String(project._id)}
              href={`/dashboard/projects/${project.slug}`}
              className="group block rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:bg-accent hover:shadow-lg hover:shadow-indigo-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
            >
              {/* Project avatar */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-lg font-semibold text-indigo-300 transition-transform duration-300 group-hover:scale-110">
                {project.name[0]?.toUpperCase() ?? 'P'}
              </div>

              <h2 className="mb-1 truncate text-base font-medium text-foreground transition-colors group-hover:text-indigo-300">
                {project.name}
              </h2>
              <p className="mb-3 truncate font-mono text-xs text-muted-foreground">
                {project.slug}
              </p>
              <p className="text-xs text-muted-foreground">
                Created {formatDate(project.createdAt)}
              </p>
            </Link>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
