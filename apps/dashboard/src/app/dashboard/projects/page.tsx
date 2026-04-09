import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderOpen } from 'lucide-react';
import { auth } from '../../../../auth';
import { connectDB, Project } from '@uploadkit/db';
import { Button } from '@uploadkit/ui';
import { CreateProjectDialog } from '../../../components/create-project-dialog';
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
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={String(project._id)}
              href={`/dashboard/projects/${project.slug}`}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
            >
              {/* Project avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-lg font-semibold text-indigo-300 mb-4">
                {project.name[0]?.toUpperCase() ?? 'P'}
              </div>

              <h2 className="text-base font-medium text-foreground group-hover:text-indigo-300 transition-colors mb-1 truncate">
                {project.name}
              </h2>
              <p className="text-xs font-mono text-muted-foreground mb-3 truncate">
                {project.slug}
              </p>
              <p className="text-xs text-muted-foreground">
                Created {formatDate(project.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
