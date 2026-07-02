import { FileBrowser } from '../../../../../components/file-browser/file-browser';

export const dynamic = 'force-dynamic';

interface FilesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Asset library</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and manage files uploaded to this project.
        </p>
      </div>
      <FileBrowser slug={slug} />
    </div>
  );
}
