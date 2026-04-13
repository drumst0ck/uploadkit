// UploadDropzoneNeon — Cyberpunk/synthwave aesthetic. Neon glow traces on the
// border during drag-over, scanline overlay, monospace typography, TRON-inspired
// sharp corners. Reuses ProxyUploadKitClient via useUploadKitContext for
// multi-file parallel uploads (CONCURRENCY = 3).

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { getUploadIcon } from '../utils/file-icons';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// CSS vars reference (override in your stylesheet or :root):
//   --uk-neon-glow      default #00ff88   — accent colour & glow source
//   --uk-neon-bg        default #0a0f0a   — container background
//   --uk-neon-border    default rgba(0,255,136,0.15) — idle border colour
// ---------------------------------------------------------------------------

export type UploadDropzoneNeonProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: Error;
};

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(file: File, accept?: string[], maxSize?: number): string | null {
  if (accept && accept.length > 0) {
    const ok = accept.some((p) =>
      p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
    );
    if (!ok) return 'type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

// Inline styles as constants — no Tailwind in SDK packages; all theming via
// CSS custom properties so consumers can override freely.
const styles = {
  container: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: '32px 24px',
    // Sharp corners are intentional — cyberpunk aesthetic avoids rounded softness
    borderRadius: 4,
    backgroundColor: 'var(--uk-neon-bg, #0a0f0a)',
    border: '1px solid var(--uk-neon-border, rgba(0,255,136,0.15))',
    cursor: 'pointer',
    transition: 'border-color 0.25s ease-out, box-shadow 0.25s ease-out',
    userSelect: 'none' as const,
    outline: 'none',
  },
  containerDragging: {
    // Full neon border + dual glow (outer spread + inner fill) when dragging
    borderColor: 'var(--uk-neon-glow, #00ff88)',
    boxShadow:
      '0 0 30px -5px var(--uk-neon-glow, #00ff88), inset 0 0 30px -10px var(--uk-neon-glow, #00ff88)',
  },
  containerDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed' as const,
    pointerEvents: 'none' as const,
  },
  // Scanline overlay — repeating 1 px transparent / semi-black lines that
  // simulate a CRT screen texture. Kept at opacity 0.04 so it's subliminal.
  scanlines: {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    zIndex: 0,
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.08) 1px, rgba(0,0,0,0.08) 2px)',
    opacity: 0.04,
    borderRadius: 'inherit',
  },
  icon: {
    width: 40,
    height: 40,
    // Neon glow colour at 70% opacity — visible but not overpowering
    color: 'var(--uk-neon-glow, #00ff88)',
    opacity: 0.7,
    position: 'relative' as const,
    zIndex: 1,
  },
  title: {
    margin: 0,
    // All-caps + wide letter-spacing for the cyberpunk monospace feel
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--uk-neon-glow, #00ff88)',
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
  },
  subtitle: {
    margin: 0,
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'rgba(0,255,136,0.5)',
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    overflowWrap: 'break-word' as const,
  },
  list: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    position: 'relative' as const,
    zIndex: 1,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    borderRadius: 2,
    backgroundColor: 'rgba(0,255,136,0.04)',
    border: '1px solid rgba(0,255,136,0.12)',
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--uk-neon-glow, #00ff88)',
  },
  chipLabel: {
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 160,
    opacity: 0.85,
  },
  chipBarWrap: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,255,136,0.12)',
    overflow: 'hidden',
  },
  chipBarFill: {
    height: '100%',
    borderRadius: 1,
    // Gradient on the progress fill to give it a lit-up neon tube feel
    background:
      'linear-gradient(90deg, rgba(0,255,136,0.4) 0%, var(--uk-neon-glow, #00ff88) 100%)',
    transition: 'width 0.15s linear',
  },
  chipPercent: {
    fontVariantNumeric: 'tabular-nums' as const,
    opacity: 0.7,
    flexShrink: 0,
  },
};

export const UploadDropzoneNeon = forwardRef<HTMLDivElement, UploadDropzoneNeonProps>(
  (
    {
      route,
      accept,
      maxSize,
      maxFiles,
      metadata,
      onUploadComplete,
      onUploadError,
      disabled = false,
      className,
      children,
    },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    const processFiles = useCallback(
      async (incoming: File[]) => {
        if (disabled) return;
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];
        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
          } else {
            accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0 });
          }
        }
        if (accepted.length === 0) return;
        setFiles((prev) => [...prev, ...accepted]);

        const CONCURRENCY = 3;
        const results: UploadResult[] = [];
        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const out = await Promise.all(
            batch.map(async (entry) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' } : f)),
              );
              try {
                const r = await client.upload({
                  file: entry.file,
                  route,
                  ...(metadata !== undefined ? { metadata } : {}),
                  onProgress: (percent) =>
                    setFiles((prev) =>
                      prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
                    ),
                });
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === entry.id ? { ...f, status: 'success', progress: 100 } : f,
                  ),
                );
                return r;
              } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setFiles((prev) =>
                  prev.map((f) => (f.id === entry.id ? { ...f, status: 'error', error } : f)),
                );
                onUploadError?.(error);
                return null;
              }
            }),
          );
          for (const r of out) if (r !== null) results.push(r);
        }
        if (results.length > 0) onUploadComplete?.(results);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [client, route, accept, maxSize, maxFiles, disabled, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      if (disabled) return;
      inputRef.current?.click();
    }

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : 'idle';

    const containerStyle = {
      ...styles.container,
      ...(isDragging ? styles.containerDragging : {}),
      ...(disabled ? styles.containerDisabled : {}),
    };

    // When Motion is available and user hasn't requested reduced motion,
    // we animate the container's boxShadow on drag state change so the glow
    // pulses in smoothly rather than snapping via CSS transition alone.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MotionDiv: any = animated ? m!.motion.div : null;
    const ContainerEl = animated ? (MotionDiv as React.ElementType) : 'div';

    const motionProps = animated
      ? {
          animate: {
            boxShadow: isDragging
              ? '0 0 30px -5px var(--uk-neon-glow, #00ff88), inset 0 0 30px -10px var(--uk-neon-glow, #00ff88)'
              : '0 0 0 0 rgba(0,0,0,0)',
          },
          transition: { duration: 0.28, ease: 'easeOut' },
        }
      : {};

    return (
      <ContainerEl
        ref={ref}
        className={mergeClass('uk-dropzone-neon', className)}
        data-uk-element="container"
        data-state={containerState}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Drop files to upload"
        {...handlers}
        {...motionProps}
        onClick={openPicker}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        style={containerStyle}
      >
        {/* Scanline CRT overlay — aria-hidden so screen readers skip the decoration */}
        <div aria-hidden="true" style={styles.scanlines} />

        <div
          style={styles.icon}
          dangerouslySetInnerHTML={{ __html: getUploadIcon() }}
        />

        <h3 className="uk-dropzone-neon__title" style={styles.title}>
          {children ?? 'DROP FILES TO UPLOAD'}
        </h3>

        {accept && accept.length > 0 && (
          <p className="uk-dropzone-neon__subtitle" style={styles.subtitle}>
            {accept.join(' · ')}
          </p>
        )}

        {files.length > 0 && (
          <div className="uk-dropzone-neon__list" style={styles.list}>
            {files.map((f) =>
              animated ? (
                // File items slide in from the left — staggered by index is left
                // as a consumer concern; here each item animates independently.
                <MotionDiv
                  key={f.id}
                  className="uk-dropzone-neon__chip"
                  data-state={f.status}
                  style={styles.chip}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <span style={styles.chipLabel}>{f.file.name}</span>
                  <div style={styles.chipBarWrap}>
                    <div style={{ ...styles.chipBarFill, width: `${f.progress}%` }} />
                  </div>
                  <span style={styles.chipPercent}>{f.progress}%</span>
                </MotionDiv>
              ) : (
                <div
                  key={f.id}
                  className="uk-dropzone-neon__chip"
                  data-state={f.status}
                  style={styles.chip}
                >
                  <span style={styles.chipLabel}>{f.file.name}</span>
                  <div style={styles.chipBarWrap}>
                    <div style={{ ...styles.chipBarFill, width: `${f.progress}%` }} />
                  </div>
                  <span style={styles.chipPercent}>{f.progress}%</span>
                </div>
              ),
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          hidden
          accept={accept?.join(',')}
          onChange={(e) => {
            const sel = Array.from(e.target.files ?? []);
            if (sel.length > 0) void processFiles(sel);
            e.target.value = '';
          }}
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
        />
      </ContainerEl>
    );
  },
);

UploadDropzoneNeon.displayName = 'UploadDropzoneNeon';
