import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { connectDB, Project } from '@uploadkit/db';

// Force dynamic rendering — auth() and connectDB() require runtime env vars
// (AUTH_SECRET, MONGODB_URI) that are unavailable during static prerendering.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  // D-07: "My First Project" is auto-created on signup via the createUser event in auth.ts
  const projects = await Project.find({ userId: session.user.id }).lean();

  const greeting = session.user.name
    ? `Welcome, ${session.user.name}`
    : 'Welcome';

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white mb-2">{greeting}</h1>
      <p className="text-zinc-400 mb-8">Here&apos;s an overview of your projects.</p>

      {projects.length === 0 ? (
        /* D-06: empty state — edge case if createUser event didn't fire */
        <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-12 text-center">
          <p className="text-zinc-400 mb-4">No projects yet.</p>
          <p className="text-sm text-zinc-500">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={String(project._id)}
              className="rounded-xl border border-white/[0.06] bg-[#141416] p-6 transition-colors hover:border-white/[0.10]"
            >
              <h2 className="text-lg font-medium text-white">{project.name}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Slug: <span className="font-mono text-zinc-400">{project.slug}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
