import { FileBrowser } from '../../../../../components/file-browser/file-browser';

export const dynamic = 'force-dynamic';

interface FilesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground">
          Browse and manage files uploaded to this project.
        </p>
      </div>
      <FileBrowser slug={slug} />
    </div>
  );
}
