'use client';

// Client-boundary re-export of @uploadkitdev/react components used in MDX
// previews. Fumadocs MDX pages render as React Server Components by default,
// and importing hooks-backed SDK components directly into an MDX file pulls
// them into the server graph — which fails because every component uses
// createContext/useState/useEffect.
//
// By re-exporting everything from a file marked `'use client'`, the boundary
// is moved here: MDX pages import from this module, the bundler sees the
// `use client` directive, and the SDK components are correctly compiled into
// the client bundle.

import { useState } from 'react';
import {
  UploadModal as _UploadModal,
  FileList as _FileList,
  FilePreview as _FilePreview,
  ProxyUploadKitClient,
} from '@uploadkitdev/react';
import type { UploadResult } from '@uploadkitdev/react';

// --- Mock upload client for docs previews ---
//
// Simulates the full upload flow with synthesized progress events so
// components animate authentically without hitting a server. Extends
// ProxyUploadKitClient so it passes the nominal type check when injected
// via <UploadKitProvider client={mock}>.
//
// Progress curve: 0 → 100 over ~2.4s with 12 ticks (fine granularity).
export class MockProxyUploadKitClient extends ProxyUploadKitClient {
  constructor() {
    super({ endpoint: '/api/uploadkit-docs-noop' });
  }

  override async upload(options: {
    file: File;
    route: string;
    metadata?: Record<string, unknown>;
    onProgress?: (percentage: number) => void;
    signal?: AbortSignal;
  }): Promise<UploadResult> {
    const { file, onProgress, signal } = options;
    const steps = 12;
    const stepDelay = 180;

    for (let i = 1; i <= steps; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      await new Promise<void>((resolve) => setTimeout(resolve, stepDelay));
      const pct = Math.round((i / steps) * 100);
      onProgress?.(pct);
    }

    return {
      id: `mock-${Date.now()}`,
      key: `demo/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    };
  }
}

export function createMockClient(): ProxyUploadKitClient {
  return new MockProxyUploadKitClient();
}

export {
  UploadButton,
  UploadDropzone,
  UploadModal,
  FileList,
  FilePreview,
  UploadDropzoneGlass,
  UploadDropzoneAurora,
  UploadDropzoneTerminal,
  UploadDropzoneBrutal,
  UploadDropzoneMinimal,
  UploadDropzoneNeon,
  UploadButtonShimmer,
  UploadButtonMagnetic,
  UploadButtonPulse,
  UploadButtonGradient,
  UploadAvatar,
  UploadInlineChat,
  UploadProgressRadial,
  UploadProgressBar,
  UploadProgressStacked,
  UploadProgressOrbit,
  UploadCloudRain,
  UploadBento,
  UploadParticles,
  UploadStepWizard,
  UploadProgressWave,
  UploadProgressLiquid,
  UploadGalleryGrid,
  UploadTimeline,
  UploadPolaroid,
  UploadKanban,
  UploadNotificationPanel,
  UploadSourceTabs,
  UploadEnvelope,
  UploadBlueprint,
  UploadVinyl,
  UploadDataStream,
  UploadAttachmentTray,
  UploadScannerFrame,
  UploadBookFlip,
  UploadStickyBoard,
  UploadBeam,
  UploadButtonBeam,
} from '@uploadkitdev/react';

// --- Demo helpers for docs previews ---

/** Opens an UploadModal on click — hides the controlled state from MDX. */
export function UploadModalDemo({ route = 'demo' }: { route?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 18px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: '#fafafa',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Open upload modal
      </button>
      <_UploadModal route={route} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// Sample data used by FileList / FilePreview previews. URLs point to tiny
// public placeholders so thumbnails render without a real upload.
const SAMPLE_FILES: UploadResult[] = [
  {
    id: 'demo-1',
    key: 'demo/photo.jpg',
    name: 'mountain-sunrise.jpg',
    size: 2_450_000,
    type: 'image/jpeg',
    url: 'https://picsum.photos/seed/uploadkit1/96/96',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    key: 'demo/doc.pdf',
    name: 'quarterly-report.pdf',
    size: 1_120_000,
    type: 'application/pdf',
    url: 'https://example.com/demo.pdf',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    key: 'demo/clip.mp4',
    name: 'demo-clip.mp4',
    size: 8_300_000,
    type: 'video/mp4',
    url: 'https://example.com/demo.mp4',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
  },
];

export function FileListDemo() {
  const [files, setFiles] = useState(SAMPLE_FILES);
  return (
    <_FileList
      files={files}
      onDelete={(fileKey) => setFiles((prev) => prev.filter((f) => f.key !== fileKey))}
    />
  );
}

export function FilePreviewDemo() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {SAMPLE_FILES.map((f) => (
        <_FilePreview key={f.key} file={f} />
      ))}
    </div>
  );
}
