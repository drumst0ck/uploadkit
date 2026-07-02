import { redirect, notFound } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { ProjectSettingsForm } from '../../../../../components/project-settings-form';
import {
  ByosSettings,
  CustomDomainSettings,
  LifecycleSettings,
} from '../../../../../components/project-advanced-settings';
import { getCloudflareConfig } from '@uploadkitdev/cloudflare';
import { getUserTier } from '../../../../../lib/tier';

export const dynamic = 'force-dynamic';

interface ProjectSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) notFound();

  const tier = await getUserTier(session.user.id);
  const cfConfig = getCloudflareConfig();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Project Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage settings for <span className="text-foreground">{project.name}</span>.
        </p>
      </div>

      <ProjectSettingsForm initialName={project.name} slug={project.slug} />

      <ByosSettings
        slug={project.slug}
        tier={tier}
        initial={{
          storageMode: project.storageMode ?? 'managed',
          hasByosConfig: Boolean(project.byosConfig),
          ...(project.byosConfig
            ? {
                provider: project.byosConfig.provider,
                ...(project.byosConfig.endpoint ? { endpoint: project.byosConfig.endpoint } : {}),
                region: project.byosConfig.region,
                bucket: project.byosConfig.bucket,
                accessKeyId: project.byosConfig.accessKeyId,
                ...(project.byosConfig.publicUrl ? { publicUrl: project.byosConfig.publicUrl } : {}),
              }
            : {}),
        }}
      />

      <CustomDomainSettings
        slug={project.slug}
        tier={tier}
        {...(project.customCdnDomain ? { initialDomain: project.customCdnDomain } : {})}
        initialStatus={project.customCdnStatus ?? 'none'}
        initialVerified={project.customCdnVerified ?? false}
        initialValidationRecords={project.customCdnValidationRecords ?? []}
        {...(project.customCdnLastError ? { initialLastError: project.customCdnLastError } : {})}
        fallbackOrigin={cfConfig?.fallbackOrigin ?? null}
      />

      <LifecycleSettings
        slug={project.slug}
        initial={{
          enabled: project.lifecyclePolicy?.enabled ?? false,
          retentionDays: project.lifecyclePolicy?.retentionDays ?? 30,
        }}
      />
    </div>
  );
}
