'use client';

import { UploadKitProvider, UploadDropzone } from '@uploadkitdev/react';

export default function Home() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <main className="min-h-screen grid place-items-center p-8">
        <div className="w-full max-w-lg space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              UploadKit demo
            </h1>
            <p className="text-sm text-zinc-400">
              Drop a file below to test your setup. Once it works, replace{' '}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                UPLOADKIT_API_KEY
              </code>{' '}
              in <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">.env.local</code> with
              a real key from{' '}
              <a
                className="text-indigo-400 underline-offset-4 hover:underline"
                href="https://uploadkit.dev/signup"
                target="_blank"
                rel="noreferrer"
              >
                uploadkit.dev
              </a>
              .
            </p>
          </header>

          <UploadDropzone
            route="imageUploader"
            onUploadComplete={(result) => {
              console.log('uploaded', result);
            }}
            onUploadError={(err) => {
              console.error('upload error', err);
            }}
          />
        </div>
      </main>
    </UploadKitProvider>
  );
}
