import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Playground — UploadKit Docs',
  description: 'Try UploadKit uploads without creating an account.',
};

export default function PlaygroundPage() {
  return (
    <main className="uk-standalone">
      <Link href="/docs" className="uk-link uk-standalone__back">
        <span aria-hidden="true">←</span> Docs
      </Link>
      <h1 className="uk-display">Upload playground</h1>
      <p className="uk-lead">
        Sandbox mode — rate-limited demo uploads.{' '}
        <Link href="https://app.uploadkit.dev/login" className="uk-underline">
          Create a free account
        </Link>{' '}
        for production use.
      </p>

      <section aria-labelledby="pg-embed">
        <h2 id="pg-embed" className="uk-heading">
          Embed the React SDK
        </h2>
        <pre tabIndex={0}>
          <code>{`import { UploadKitProvider, UploadDropzone } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export function Playground() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <UploadDropzone route="default" />
    </UploadKitProvider>
  );
}`}</code>
        </pre>
        <p>Image transforms are available on UploadKit Cloud only — not on BYOS buckets.</p>
      </section>
    </main>
  );
}
