import { notFound } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { connectDB, Project } from '@uploadkit/db';
import { UploadLogsTable } from '../../../../../components/upload-logs-table';

export const dynamic = 'force-dynamic';

interface LogsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LogsPage({ params }: LogsPageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { slug } = await params;

  await connectDB();
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Upload Logs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time upload activity for this project. Auto-refreshes every 5 seconds.
        </p>
      </div>

      <UploadLogsTable slug={slug} />
    </div>
  );
}
