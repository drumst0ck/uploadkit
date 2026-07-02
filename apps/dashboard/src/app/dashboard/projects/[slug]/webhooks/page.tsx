import { redirect, notFound } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Project, FileRouter, File } from '@uploadkitdev/db';
import { WebhooksPanel } from '../../../../../components/webhooks-panel';
import { getUserTier } from '../../../../../lib/tier';

export const dynamic = 'force-dynamic';

interface WebhooksPageProps {
  params: Promise<{ slug: string }>;
}

export default async function WebhooksPage({ params }: WebhooksPageProps) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) notFound();

  const tier = await getUserTier(session.user.id);

  const routes = await FileRouter.find({ projectId: project._id })
    .select('slug webhookUrl')
    .lean();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const failedFiles = await File.find({
    projectId: project._id,
    webhookFailedAt: { $gte: thirtyDaysAgo },
  })
    .select('name webhookFailedAt key')
    .sort({ webhookFailedAt: -1 })
    .limit(20)
    .lean();

  const failures = failedFiles.map((f) => {
    const parts = f.key?.split('/') ?? [];
    return {
      fileId: String(f._id),
      fileName: f.name,
      routeSlug: parts[1] ?? 'unknown',
      failedAt: f.webhookFailedAt!.toISOString(),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor webhook endpoints and delivery failures for {project.name}.
        </p>
      </div>

      <WebhooksPanel
        tier={tier}
        routes={routes.map((r) => ({ slug: r.slug, webhookUrl: r.webhookUrl }))}
        failures={failures}
      />
    </div>
  );
}
