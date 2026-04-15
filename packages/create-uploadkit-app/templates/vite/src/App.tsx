import { UploadDropzone, UploadKitProvider } from '@uploadkitdev/react';

// This template is a pure SPA. It talks to a backend you provide (BYOS).
// - In development, `VITE_UPLOADKIT_ENDPOINT` defaults to `/api/sign`.
// - For prototyping without a backend, the dropzone will render but uploads
//   will fail until you point the endpoint at a real presigned-URL service.
//
// WARNING: the `VITE_*` env prefix is browser-exposed. Only ever put a
// `uk_test_*` key here, never a `uk_live_*` key. Live keys MUST stay on a
// server you control.
const ENDPOINT =
  import.meta.env.VITE_UPLOADKIT_ENDPOINT ?? '/api/sign';

export default function App() {
  return (
    <UploadKitProvider endpoint={ENDPOINT}>
      <main
        style={{
          padding: 48,
          maxWidth: 640,
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            UploadKit — Vite + React
          </h1>
          <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>
            This is a pure SPA. Point{' '}
            <code
              style={{
                background: '#141416',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              VITE_UPLOADKIT_ENDPOINT
            </code>{' '}
            at your own backend that returns presigned PUT URLs (BYOS).
            See <code
              style={{
                background: '#141416',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              README.md
            </code>{' '}
            for a minimal Hono / Express / Workers example.
          </p>
        </header>

        <UploadDropzone
          onUploadComplete={(results) => {
            // eslint-disable-next-line no-console
            console.log('uploaded', results);
          }}
          onUploadError={(error) => {
            // eslint-disable-next-line no-console
            console.error('upload error', error);
          }}
        />
      </main>
    </UploadKitProvider>
  );
}
