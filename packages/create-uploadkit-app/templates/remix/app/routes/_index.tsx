import { UploadDropzone, UploadKitProvider } from '@uploadkitdev/react';

export function meta() {
  return [
    { title: 'UploadKit — React Router v7' },
    {
      name: 'description',
      content: 'File uploads in React Router v7 powered by UploadKit.',
    },
  ];
}

export default function Index() {
  return (
    <UploadKitProvider endpoint="/api/sign">
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
            UploadKit — React Router v7
          </h1>
          <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>
            Drop a file to test your setup. Uploads are signed server-side by{' '}
            <code
              style={{
                background: '#141416',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              app/routes/api.sign.ts
            </code>{' '}
            and sent directly to storage. Edit{' '}
            <code
              style={{
                background: '#141416',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              .env.local
            </code>{' '}
            to plug in your credentials.
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
