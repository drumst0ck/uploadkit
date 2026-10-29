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
  // Flat grey square seeded by index — picsum is blocked in CSP sometimes,
  // so we use an SVG as the file content.
  const grey = 60 + ((i * 37) % 120);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="rgb(${grey},${grey},${grey})"/></svg>`;
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
    <div className="uk-docs-preview" style={{ minHeight: height }} data-theme="dark">
      <UploadKitProvider client={mockClient}>
        <div ref={stageRef} className="uk-docs-preview__stage">
          {children}
        </div>
      </UploadKitProvider>

      {simulate ? (
        <button
          type="button"
          className="uk-docs-preview__simulate"
          onClick={() => {
            if (stageRef.current) triggerFakeUpload(stageRef.current, simulateFiles);
          }}
          aria-label="Simulate upload with fake files"
        >
          Simulate upload
        </button>
      ) : null}

      {caption ? <p className="uk-docs-preview__caption">{caption}</p> : null}
    </div>
  );
}
