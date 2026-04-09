import { ApiKeysTable } from '../../../../../components/api-keys-table';
import { TestDialog } from '../../../../../components/test-dialog';

export const dynamic = 'force-dynamic';

interface KeysPageProps {
  params: Promise<{ slug: string }>;
}

export default async function KeysPage({ params }: KeysPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys for this project. Keys authenticate SDK and API requests.
        </p>
      </div>
      <TestDialog />
      <ApiKeysTable slug={slug} />
    </div>
  );
}
