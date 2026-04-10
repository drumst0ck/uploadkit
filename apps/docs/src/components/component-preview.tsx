'use client';

import { UploadKitProvider } from '@uploadkitdev/react';
import { useRef, useMemo, type ReactNode } from 'react';
import { createMockClient } from './preview-components';

export type ComponentPreviewProps = {
  children: ReactNode;
  /** Optional inspiration/caption line rendered in the corner of the stage. */
  caption?: string;
  /** Stage intrinsic height — default 280px. */
  height?: number;
  /**
   * Whether to show the "Simulate upload" button in the corner.
   * Defaults to true for upload components; set `simulate={false}` for
   * preview-only components (FileList, FilePreview, etc.) that don't
   * have an internal file input.
   */
  simulate?: boolean;
  /**
   * Number of fake files the simulate button will inject. Defaults to 1.
   * Multi-file dropzones / stacks / bento look better with 3.
   */
  simulateFiles?: number;
};

// Build a tiny PNG blob so fake uploads have an actual image preview.
// 1x1 transparent PNG base64 — expanded to a ~20KB filler so the formatBytes
// call shows something other than "0 B".
function makeFakeFile(i: number): File {
  const size = 120_000 + Math.floor(Math.random() * 80_000);
  // Gradient-ish color seeded by index — picsum is blocked in CSP sometimes,
  // so we use a colored SVG as the file content.
  const hue = (i * 57) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g"><stop offset="0%" stop-color="hsl(${hue},70%,55%)"/><stop offset="100%" stop-color="hsl(${(hue + 60) % 360},70%,45%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/></svg>`;
  // Pad with whitespace to reach the target size
  const padded = svg + ' '.repeat(Math.max(0, size - svg.length));
  return new File([padded], `sample-${i + 1}.svg`, { type: 'image/svg+xml' });
}

function triggerFakeUpload(stage: HTMLElement, count: number) {
  const input = stage.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) return;

  const dt = new DataTransfer();
  for (let i = 0; i < count; i++) dt.items.add(makeFakeFile(i));

  // Modern browsers reject direct assignment to `files` — use DataTransfer.
  try {
    input.files = dt.files;
  } catch {
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function ComponentPreview({
  children,
  caption,
  height = 280,
  simulate = true,
  simulateFiles = 1,
}: ComponentPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  // One mock client per preview instance so uploads don't collide.
  const mockClient = useMemo(() => createMockClient(), []);

  return (
    <div
      className="uk-docs-preview"
      style={{
        position: 'relative',
        marginTop: '1.25rem',
        marginBottom: '1.25rem',
        padding: '28px',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background:
          'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.12), transparent 60%), #0a0a0b',
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      data-theme="dark"
    >
      <UploadKitProvider client={mockClient}>
        <div
          ref={stageRef}
          style={{
            width: '100%',
            maxWidth: 560,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </UploadKitProvider>

      {simulate ? (
        <button
          type="button"
          onClick={() => {
            if (stageRef.current) triggerFakeUpload(stageRef.current, simulateFiles);
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.12)',
            color: '#c7d2fe',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'border-color 150ms ease, background 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
          }}
          aria-label="Simulate upload with fake files"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: '#818cf8',
              boxShadow: '0 0 8px #818cf8',
            }}
            aria-hidden="true"
          />
          Simulate upload
        </button>
      ) : null}

      {caption ? (
        <p
          style={{
            position: 'absolute',
            bottom: 10,
            right: 16,
            margin: 0,
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--uk-font, system-ui)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
