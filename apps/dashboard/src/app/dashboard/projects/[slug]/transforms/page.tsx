import { redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, File, ImageTransformation, Project, Subscription, UsageRecord } from '@uploadkitdev/db';
import { TIER_LIMITS, type Tier } from '@uploadkitdev/shared';
import { ImageTransformStudio } from '../../../../../components/image-transform-studio';

export const dynamic = 'force-dynamic';

export default async function TransformationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { slug } = await params;
  await connectDB();
  const period = new Date().toISOString().slice(0, 7);
  const project = await Project.findOne({ slug, userId: session.user.id }).select('_id').lean();
  const requestedFile = (await searchParams).file;
  const [subscription, usage, transformations] = await Promise.all([
    Subscription.findOne({ userId: session.user.id }).select('tier imageTransformLimit').lean(),
    UsageRecord.findOne({ userId: session.user.id, period }).select('imageTransforms').lean(),
    ImageTransformation.find({
      userId: session.user.id,
      ...(project ? { projectId: project._id } : {}),
      status: 'COMMITTED',
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);
  const tier: Tier = subscription?.tier ?? 'FREE';
  const fileIds = transformations.map((item) => item.fileId);
  const files = await File.find({ _id: { $in: fileIds } }).select('name').lean();
  const fileNames = new Map(files.map((file) => [String(file._id), file.name]));
  const initialHistory = transformations.map((item) => ({
    id: String(item._id),
    fileName: fileNames.get(String(item.fileId)) ?? 'Deleted image',
    units: item.units,
    createdAt: item.createdAt.toISOString(),
  }));
  const initialFile = project && requestedFile?.match(/^[a-f\d]{24}$/i)
    ? await File.findOne({
        _id: requestedFile,
        projectId: project._id,
        status: 'UPLOADED',
        deletedAt: null,
        type: { $regex: '^image/' },
      }).lean()
    : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Image pipeline</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transformations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create optimized image variants without leaving UploadKit. Every result is signed, CDN-ready and cached globally.</p>
        </div>
        <div className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:block">Up to 4096 × 4096</div>
      </header>
      <ImageTransformStudio
        slug={slug}
        paid={tier !== 'FREE'}
        initialFile={initialFile ? {
          _id: String(initialFile._id),
          name: initialFile.name,
          key: initialFile.key,
          size: initialFile.size,
          type: initialFile.type,
          url: initialFile.url,
          status: initialFile.status,
          projectId: String(initialFile.projectId),
          createdAt: initialFile.createdAt.toISOString(),
          updatedAt: initialFile.updatedAt.toISOString(),
        } : null}
        initialUsage={{
          used: usage?.imageTransforms ?? 0,
          limit: subscription?.imageTransformLimit ?? TIER_LIMITS[tier].maxImageTransformsPerMonth,
        }}
        initialHistory={initialHistory}
      />
    </div>
  );
}
