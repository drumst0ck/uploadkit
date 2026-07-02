import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Playground — UploadKit Docs',
  description: 'Try UploadKit uploads without creating an account.',
};

export default function PlaygroundPage() {
  return (
    <main className="container mx-auto max-w-3xl py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">Upload playground</h1>
      <p className="text-muted-foreground mb-8">
        Sandbox mode — rate-limited demo uploads.{' '}
        <Link href="https://app.uploadkit.dev/login" className="text-primary underline">
          Create a free account
        </Link>{' '}
        for production use.
      </p>

      <div className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground mb-4">
          Embed the React SDK in your app:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`import { UploadKitProvider, UploadDropzone } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export function Playground() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <UploadDropzone route="default" />
    </UploadKitProvider>
  );
}`}
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Image transforms are available on UploadKit Cloud only — not on BYOS buckets.
        </p>
      </div>
    </main>
  );
}
