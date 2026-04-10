'use client';

import { UploadKitProvider } from '@uploadkitdev/react';
import type { ReactNode } from 'react';

// Non-existent endpoint — uploads are intentionally no-op in docs previews.
// Matches the pattern used by apps/web/src/app/test/components/component-showcase.tsx.
const FAKE_ENDPOINT = '/api/uploadkit-docs-noop';

export type ComponentPreviewProps = {
  children: ReactNode;
  /** Optional inspiration/caption line rendered in the corner of the stage. */
  caption?: string;
  /** Stage intrinsic height — default 280px. */
  height?: number;
};

export function ComponentPreview({ children, caption, height = 280 }: ComponentPreviewProps) {
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
      <UploadKitProvider endpoint={FAKE_ENDPOINT}>
        <div
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
