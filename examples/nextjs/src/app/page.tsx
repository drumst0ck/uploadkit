'use client';

import { useState } from 'react';
import { UploadKitProvider, UploadButton, UploadDropzone, UploadModal } from '@uploadkitdev/react';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <UploadKitProvider endpoint="/api/uploadkit">
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>UploadKit — Next.js Example</h1>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadButton (Images, max 4MB each)</h2>
          <UploadButton
            route="imageUploader"
            onUploadComplete={(res) => {
              console.log('Upload complete:', res);
              alert(`Uploaded: ${res.name}`);
            }}
            onUploadError={(err) => {
              console.error('Upload error:', err);
              alert(`Error: ${err.message}`);
            }}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadDropzone (Documents, max 16MB)</h2>
          <UploadDropzone
            route="documentUploader"
            config={{ mode: 'manual' }}
            onUploadComplete={(results) => {
              console.log('Documents uploaded:', results);
              alert(`Uploaded ${Array.isArray(results) ? results.length : 1} document(s)`);
            }}
            onUploadError={(err) => console.error('Upload error:', err)}
          />
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>UploadModal (Images)</h2>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--uk-accent, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Open Upload Modal
          </button>
          <UploadModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            route="imageUploader"
            title="Upload Images"
            onUploadComplete={(res) => {
              console.log('Modal upload complete:', res);
              setModalOpen(false);
            }}
          />
        </section>
      </main>
    </UploadKitProvider>
  );
}
