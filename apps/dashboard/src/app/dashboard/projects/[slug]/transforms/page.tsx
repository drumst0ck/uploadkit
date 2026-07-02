import { redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Subscription } from '@uploadkitdev/db';
import { ImageTransformStudio } from '../../../../../components/image-transform-studio';

export const dynamic = 'force-dynamic';

export default async function TransformationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { slug } = await params;
  await connectDB();
  const subscription = await Subscription.findOne({ userId: session.user.id }).select('tier').lean();
  const paid = subscription?.tier !== undefined && subscription.tier !== 'FREE';

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
      <ImageTransformStudio slug={slug} paid={paid} />
    </div>
  );
}
