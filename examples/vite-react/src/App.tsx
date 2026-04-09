import { UploadKitProvider, UploadButton, UploadDropzone } from '@uploadkit/react';

export default function App() {
  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#0a0a0b',
        minHeight: '100vh',
        color: '#fafafa',
      }}>
        <h1 style={{ marginBottom: '0.5rem' }}>UploadKit — Vite + React</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '3rem' }}>
          Frontend: Vite 6 + React 19 &nbsp;|&nbsp; Backend: Express 5 + createExpressHandler
        </p>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Avatar Upload (JPEG/PNG/WebP, max 2MB)</h2>
          <UploadButton
            route="avatar"
            onUploadComplete={(res) => {
              console.log('Avatar uploaded:', res);
              alert(`Uploaded: ${res.name}`);
            }}
            onUploadError={(err) => console.error('Error:', err)}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Attachments (any type, max 5 files, 10MB each)</h2>
          <UploadDropzone
            route="attachment"
            config={{ mode: 'manual' }}
            onUploadComplete={(results) => {
              const files = Array.isArray(results) ? results : [results];
              console.log('Attachments uploaded:', files);
              alert(`Uploaded ${files.length} file(s)`);
            }}
            onUploadError={(err) => console.error('Error:', err)}
          />
        </section>
      </div>
    </UploadKitProvider>
  );
}
