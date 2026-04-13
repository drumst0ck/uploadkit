// UploadEnvelope — WeTransfer-inspired 3D envelope component. The flap opens
// on drag-over (rotateX perspective animation), files slide into the body, a
// wax seal appears on completion. CSS custom properties for full theming. All
// styling via inline styles — zero Tailwind dependency (SDK constraint).

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadEnvelopeProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Status dot SVG inline — tiny, no dep
function StatusDot({ status }: { status: FileEntry['status'] }) {
  const color =
    status === 'success'
      ? 'var(--uk-success, #22c55e)'
      : status === 'error'
        ? 'var(--uk-error, #ef4444)'
        : status === 'uploading'
          ? 'var(--uk-accent, #6366f1)'
          : 'var(--uk-text-secondary, #71717a)';
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        marginTop: 1,
        ...(status === 'uploading'
          ? { boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 30%, transparent)` }
          : {}),
      }}
    />
  );
}

// Checkmark SVG for the wax seal
const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <path
      d="M3.5 8.5L6.5 11.5L12.5 5"
      stroke="white"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CONCURRENCY = 3;

export const UploadEnvelope = forwardRef<HTMLDivElement, UploadEnvelopeProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, className, children },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // -----------------------------------------------------------------------
    // Upload logic
    // -----------------------------------------------------------------------

    const processFiles = useCallback(
      async (incoming: File[]) => {
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
      [client, route, accept, maxSize, maxFiles, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    // -----------------------------------------------------------------------
    // Derived state
    // -----------------------------------------------------------------------

    const totalFiles = files.length;
    const allDone = totalFiles > 0 && files.every((f) => f.status === 'success' || f.status === 'error');
    const allSuccess = totalFiles > 0 && files.every((f) => f.status === 'success');
    const isUploading = files.some((f) => f.status === 'uploading');

    // Overall progress: average across all files
    const overallProgress =
      totalFiles > 0 ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / totalFiles) : 0;

    // Flap is open when dragging, uploading, or done
    const flapOpen = isDragging || isUploading || allDone;

    // -----------------------------------------------------------------------
    // Styles
    // -----------------------------------------------------------------------

    // Envelope container — perspective gives the 3D context for the flap
    const containerStyle: React.CSSProperties = {
      perspective: '800px',
      width: 280,
      height: 200,
      position: 'relative',
      cursor: 'pointer',
      userSelect: 'none',
      // Allow container to be an accessible button surface
      outline: 'none',
    };

    // The sealed envelope body — bottom 60% of the container
    const bodyStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%', // 120px of the 200px container
      background: 'var(--uk-bg-secondary, #1c1c1e)',
      border: '1px solid var(--uk-border, rgba(255,255,255,0.08))',
      borderRadius: '0 0 8px 8px',
      // Subtle inner shadow simulates envelope depth
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.18)',
      overflow: 'hidden',
    };

    // Progress fill — rises from bottom of the body
    const progressFillStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: `${overallProgress}%`,
      background:
        'linear-gradient(to top, color-mix(in srgb, var(--uk-accent, #6366f1) 30%, transparent), transparent)',
      transition: animated ? undefined : 'height 0.3s ease',
      pointerEvents: 'none',
    };

    // Envelope "inside" visible when flap is open — sits at the top of the body
    const insideStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '8px 12px',
      fontSize: 11,
      color: 'var(--uk-text-secondary, #71717a)',
      letterSpacing: '0.02em',
      // The inside content peeks out from under the flap
      zIndex: 1,
    };

    // Flap wrapper — spans the top 40% of the container + overlaps the body
    // by a few pixels to close the seam. transform-style: preserve-3d ensures
    // the child clip-path element participates in the 3D stack.
    const flapWrapperStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      // 40% of 200px = 80px, + 4px overlap
      height: 'calc(40% + 4px)',
      transformOrigin: 'top center',
      transformStyle: 'preserve-3d',
      // When not animated (no Motion), use CSS transition
      transition: animated ? undefined : 'transform 0.4s ease',
      transform: flapOpen ? 'rotateX(180deg)' : 'rotateX(0deg)',
      zIndex: 2,
    };

    // The visual flap — a rectangle whose bottom half is clipped to a triangle
    // pointing downward (like a real envelope flap). The clip-path approach
    // renders a clean hard edge without overflow: hidden cutting off the body.
    const flapFaceStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      // Triangle shape: top-left → top-right → bottom-center
      clipPath: 'polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%)',
      background: 'var(--uk-bg-tertiary, #141416)',
      // Hairline border on the visible edges via gradient overlay trick
      // A real border can't follow a clip-path, so we use box-shadow carefully
      // (it gets clipped too) — instead we use a pseudo-border via outline
      // on the wrapper or accept the seamless look.
    };

    // Fold shadow line — the crease at the base of the flap
    const foldLineStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: -1,
      left: 0,
      right: 0,
      height: 1,
      background: 'var(--uk-border, rgba(255,255,255,0.08))',
      zIndex: 3,
    };

    // Wax seal — centered on the flap fold line, appears when all uploads succeed
    const waxSealStyle: React.CSSProperties = {
      position: 'absolute',
      // Center horizontally; align vertically to straddle the envelope fold
      // The fold is at 40% height (80px from top of 200px container).
      bottom: 'calc(60% - 16px)', // 16px = half of 32px seal diameter
      left: '50%',
      transform: 'translateX(-50%)',
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--uk-success, #22c55e)',
      boxShadow: '0 0 0 3px var(--uk-bg-secondary, #1c1c1e), 0 0 0 4px var(--uk-success, #22c55e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4,
      // CSS fallback scale when Motion not available
      transition: animated ? undefined : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
      ...(animated
        ? {} // Motion handles the transform
        : {
            opacity: allSuccess ? 1 : 0,
            transform: `translateX(-50%) scale(${allSuccess ? 1 : 0})`,
          }),
    };

    // Caption below the envelope
    const captionStyle: React.CSSProperties = {
      marginTop: 12,
      fontSize: 12,
      color: 'var(--uk-text-secondary, #71717a)',
      textAlign: 'center',
      letterSpacing: '0.01em',
    };

    // File list below envelope
    const fileListStyle: React.CSSProperties = {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      width: 280,
    };

    const fileRowStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: 'var(--uk-text-primary, #fafafa)',
      padding: '3px 0',
    };

    const fileNameStyle: React.CSSProperties = {
      flex: '0 1 auto',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: 200,
    };

    const fileSizeStyle: React.CSSProperties = {
      color: 'var(--uk-text-secondary, #71717a)',
      flexShrink: 0,
      marginLeft: 'auto',
    };

    // Focus ring for accessibility
    const focusRingStyle: React.CSSProperties = {
      position: 'absolute',
      inset: -3,
      borderRadius: 10,
      border: '2px solid var(--uk-accent, #6366f1)',
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 0.15s ease',
    };

    // -----------------------------------------------------------------------
    // Caption text
    // -----------------------------------------------------------------------

    let caption: string;
    if (allSuccess) {
      caption =
        totalFiles === 1
          ? '1 file uploaded'
          : `${totalFiles} files uploaded`;
    } else if (isUploading) {
      caption = `Uploading${totalFiles > 1 ? ` ${totalFiles} files` : ''}… ${overallProgress}%`;
    } else if (isDragging) {
      caption = 'Drop to seal the envelope';
    } else if (totalFiles > 0) {
      caption = `${totalFiles} file${totalFiles !== 1 ? 's' : ''} queued`;
    } else {
      caption = children ? String(children) : 'Drop files into the envelope';
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
      <div
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
        className={mergeClass('uk-envelope', className)}
        data-uk-element="envelope"
      >
        {/* Envelope 3D stage */}
        <div
          ref={ref}
          className="uk-envelope__stage"
          style={containerStyle}
          role="button"
          tabIndex={0}
          aria-label={caption}
          {...handlers}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          // Focus ring via CSS :focus-visible would require a stylesheet; we
          // handle it inline with onFocus/onBlur toggling a ref's style.
          onFocus={(e) => {
            const ring = e.currentTarget.querySelector<HTMLElement>('.uk-envelope__focus-ring');
            if (ring) ring.style.opacity = '1';
          }}
          onBlur={(e) => {
            const ring = e.currentTarget.querySelector<HTMLElement>('.uk-envelope__focus-ring');
            if (ring) ring.style.opacity = '0';
          }}
        >
          {/* Accessibility focus ring */}
          <span className="uk-envelope__focus-ring" aria-hidden="true" style={focusRingStyle} />

          {/* Envelope body — lower 60% */}
          <div className="uk-envelope__body" style={bodyStyle}>
            {/* Inside text — visible when flap is open */}
            <div className="uk-envelope__inside" style={insideStyle} aria-hidden="true">
              {isDragging && !totalFiles
                ? 'Ready to receive'
                : totalFiles > 0
                  ? `${totalFiles} file${totalFiles !== 1 ? 's' : ''} ready`
                  : null}
            </div>

            {/* Progress fill — rises from the bottom */}
            {animated ? (
              <m.motion.div
                className="uk-envelope__progress-fill"
                style={{ ...progressFillStyle, height: undefined }}
                animate={{ height: `${overallProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                aria-hidden="true"
              />
            ) : (
              <div
                className="uk-envelope__progress-fill"
                style={progressFillStyle}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Flap wrapper — top 40% + a small overlap, rotates open/closed */}
          {animated ? (
            <m.motion.div
              className="uk-envelope__flap-wrapper"
              style={{ ...flapWrapperStyle, transform: undefined }}
              animate={{ rotateX: flapOpen ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              aria-hidden="true"
            >
              <div className="uk-envelope__flap-face" style={flapFaceStyle} />
              {/* Fold crease line rendered on the back face (visible when flap is open) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 3,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'var(--uk-border, rgba(255,255,255,0.08))',
                }}
              />
            </m.motion.div>
          ) : (
            <div className="uk-envelope__flap-wrapper" style={flapWrapperStyle} aria-hidden="true">
              <div className="uk-envelope__flap-face" style={flapFaceStyle} />
              <div style={foldLineStyle} />
            </div>
          )}

          {/* Wax seal — appears centered on the fold when all uploads succeed */}
          {animated ? (
            <m.motion.div
              className="uk-envelope__wax-seal"
              style={{ ...waxSealStyle, transform: undefined }}
              initial={{ scale: 0, x: '-50%', opacity: 0 }}
              animate={
                allSuccess
                  ? { scale: 1, x: '-50%', opacity: 1 }
                  : { scale: 0, x: '-50%', opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              aria-label="Upload complete"
            >
              <CheckIcon />
            </m.motion.div>
          ) : (
            allSuccess && (
              <div
                className="uk-envelope__wax-seal"
                style={waxSealStyle}
                role="img"
                aria-label="Upload complete"
              >
                <CheckIcon />
              </div>
            )
          )}
        </div>

        {/* Caption */}
        <p className="uk-envelope__caption" style={captionStyle} aria-live="polite">
          {caption}
        </p>

        {/* File list */}
        {files.length > 0 && (
          <ul
            className="uk-envelope__file-list"
            style={fileListStyle}
            aria-label="Queued files"
            role="list"
          >
            {files.map((f) => (
              <li key={f.id} className="uk-envelope__file-row" style={{ ...fileRowStyle, listStyle: 'none' }}>
                <StatusDot status={f.status} />
                <span style={fileNameStyle} title={f.file.name}>
                  {f.file.name}
                </span>
                {f.error ? (
                  <span
                    style={{ ...fileSizeStyle, color: 'var(--uk-error, #ef4444)', fontSize: 10 }}
                    title={f.error.message}
                  >
                    failed
                  </span>
                ) : (
                  <span style={fileSizeStyle}>{formatBytes(f.file.size)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Hidden file input */}
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
        />
      </div>
    );
  },
);

UploadEnvelope.displayName = 'UploadEnvelope';
