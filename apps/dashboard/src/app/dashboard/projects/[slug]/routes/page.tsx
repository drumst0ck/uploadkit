import { FileRoutesTable } from '../../../../../components/file-routes-table';

export const dynamic = 'force-dynamic';

interface RoutesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RoutesPage({ params }: RoutesPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">File Routes</h1>
        <p className="text-sm text-muted-foreground">
          Configure upload routes for this project. Each route defines allowed types, size limits, and file count.
        </p>
      </div>
      <FileRoutesTable slug={slug} />
    </div>
  );
}
