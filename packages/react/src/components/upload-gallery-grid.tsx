// UploadGalleryGrid — Pinterest/Instagram-style multi-file upload grid. Images
// drop into a responsive masonry-feel grid as they upload, each cell showing a
// live thumbnail (created from a blob URL) with a dark overlay and a circular
// SVG progress ring while uploading. Completed images reveal at full brightness;
// errors swap the ring for a warning icon. Inspired by Unsplash's upload flow
// and Linear's attachment grid.

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadGalleryGridProps = {
  route: string;
  /** MIME types / globs to accept. Defaults to ['image/*']. */
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  /** Number of equal-width columns. Default 3. */
  columns?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  thumbnailUrl?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `uk-gg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(file: File, accept: string[], maxSize?: number): string | null {
  if (accept.length > 0) {
    const ok = accept.some((p) =>
      p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
    );
    if (!ok) return 'type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

// SVG ring geometry (32×32 viewBox)
const RING_SIZE = 32;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ---------------------------------------------------------------------------
// Inline style constants
// ---------------------------------------------------------------------------

const cellStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: '8px',
  overflow: 'hidden',
  position: 'relative',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: 'var(--uk-bg-secondary)',
};

function overlayStyle(isError: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    background: isError ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    borderRadius: 'inherit',
  };
}

const ringTrackStyle: React.CSSProperties = {
  fill: 'none',
  stroke: 'rgba(255,255,255,0.2)',
  strokeWidth: 3,
};

const ringFillStyle: React.CSSProperties = {
  fill: 'none',
  stroke: 'var(--uk-primary)',
  strokeWidth: 3,
  strokeLinecap: 'round',
  transform: 'rotate(-90deg)',
  transformOrigin: 'center',
};

const pctStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'white',
  fontVariantNumeric: 'tabular-nums',
};

const addBtnStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: '8px',
  border: '2px dashed var(--uk-border)',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--uk-text-secondary)',
  transition: 'all 200ms ease-out',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Circular progress ring rendered as a plain SVG (no motion dep). */
function ProgressRingStatic({ progress }: { progress: number }) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 100) / 100);
  return (
    <svg
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      width={RING_SIZE}
      height={RING_SIZE}
      aria-hidden="true"
    >
      <circle
        cx={RING_CX}
        cy={RING_CY}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        style={ringTrackStyle}
      />
      <circle
        cx={RING_CX}
        cy={RING_CY}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        style={{ ...ringFillStyle, transition: 'stroke-dashoffset 220ms ease-out' }}
      />
    </svg>
  );
}

/** Error icon centred in the overlay when upload fails. */
function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={12} />
      <line x1={12} y1={16} x2={12.01} y2={16} />
    </svg>
  );
}

/** Upload icon for the empty-state area. */
function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={36}
      height={36}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1={12} y1={3} x2={12} y2={15} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const UploadGalleryGrid = forwardRef<HTMLDivElement, UploadGalleryGridProps>(
  (
    {
      route,
      accept = ['image/*'],
      maxSize,
      maxFiles,
      columns = 3,
      metadata,
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // ------------------------------------------------------------------
    // Blob URL cleanup
    // Revoke object URLs when component unmounts or when entries are
    // replaced so we don't leak memory.
    // ------------------------------------------------------------------

    const prevFilesRef = useRef<FileEntry[]>([]);
    useEffect(() => {
      prevFilesRef.current = files;
    }, [files]);

    useEffect(() => {
      return () => {
        // Revoke all blob URLs on unmount
        for (const entry of prevFilesRef.current) {
          if (entry.thumbnailUrl) URL.revokeObjectURL(entry.thumbnailUrl);
        }
      };
    }, []);

    // ------------------------------------------------------------------
    // Core upload logic (CONCURRENCY = 3, mirrors upload-cloud-rain)
    // ------------------------------------------------------------------

    const processFiles = useCallback(
      async (incoming: File[]) => {
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];

        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
          } else {
            // Create a blob URL immediately so the grid cell can show a thumbnail
            // before the upload even starts.
            const thumbnailUrl = URL.createObjectURL(f);
            accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0, thumbnailUrl });
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
                  prev.map((f) =>
                    f.id === entry.id ? { ...f, status: 'error', error: error.message } : f,
                  ),
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

    // ------------------------------------------------------------------
    // Cell rendering
    // ------------------------------------------------------------------

    // Animated cell (motion present)
    function renderCellAnimated(entry: FileEntry) {
      if (!m) return null;
      const Div = m.motion.div as React.ElementType;
      const { AnimatePresence } = m;

      const MotionCircle = m.motion.circle as React.ElementType;

      const thumbnailStyle: React.CSSProperties = {
        ...cellStyle,
        ...(entry.thumbnailUrl ? { backgroundImage: `url(${entry.thumbnailUrl})` } : {}),
      };

      return (
        <Div
          key={entry.id}
          role="img"
          aria-label={`${entry.file.name} — ${entry.status}`}
          style={thumbnailStyle}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <AnimatePresence>
            {entry.status !== 'success' && (
              <m.motion.div
                style={overlayStyle(entry.status === 'error')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                aria-hidden="true"
              >
                {entry.status === 'error' ? (
                  <ErrorIcon />
                ) : (
                  <svg
                    viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                    width={RING_SIZE}
                    height={RING_SIZE}
                    aria-hidden="true"
                  >
                    <circle
                      cx={RING_CX}
                      cy={RING_CY}
                      r={RING_RADIUS}
                      strokeWidth={RING_STROKE}
                      style={ringTrackStyle}
                    />
                    <MotionCircle
                      cx={RING_CX}
                      cy={RING_CY}
                      r={RING_RADIUS}
                      strokeWidth={RING_STROKE}
                      pathLength={1}
                      strokeDasharray="1 1"
                      style={ringFillStyle}
                      animate={{ pathLength: entry.progress / 100 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    />
                  </svg>
                )}
                {entry.status === 'uploading' && (
                  <span style={pctStyle}>{entry.progress}%</span>
                )}
              </m.motion.div>
            )}
          </AnimatePresence>
        </Div>
      );
    }

    // Static cell (no motion)
    function renderCellStatic(entry: FileEntry) {
      const thumbnailStyle: React.CSSProperties = {
        ...cellStyle,
        ...(entry.thumbnailUrl ? { backgroundImage: `url(${entry.thumbnailUrl})` } : {}),
      };

      return (
        <div
          key={entry.id}
          role="img"
          aria-label={`${entry.file.name} — ${entry.status}`}
          data-status={entry.status}
          style={thumbnailStyle}
        >
          {entry.status !== 'success' && (
            <div
              style={overlayStyle(entry.status === 'error')}
              aria-hidden="true"
            >
              {entry.status === 'error' ? (
                <ErrorIcon />
              ) : (
                <ProgressRingStatic progress={entry.progress} />
              )}
              {entry.status === 'uploading' && (
                <span style={pctStyle}>{entry.progress}%</span>
              )}
            </div>
          )}
        </div>
      );
    }

    // ------------------------------------------------------------------
    // Container state
    // ------------------------------------------------------------------

    const hasFiles = files.length > 0;
    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : hasFiles && files.every((f) => f.status === 'success')
          ? 'success'
          : hasFiles
            ? 'partial'
            : 'idle';

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    const containerStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '8px',
      minHeight: '200px',
      width: '100%',
    };

    const emptyStateStyle: React.CSSProperties = {
      gridColumn: `span ${columns}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '40px 20px',
      border: '2px dashed var(--uk-border)',
      borderRadius: '12px',
      cursor: 'pointer',
      color: 'var(--uk-text-secondary)',
      transition: 'border-color 200ms ease-out',
    };

    const emptyTitleStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--uk-text)',
      margin: 0,
    };

    const emptyHintStyle: React.CSSProperties = {
      fontSize: '12px',
      color: 'var(--uk-text-secondary)',
      margin: 0,
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-gallery-grid', className)}
        data-uk-element="container"
        data-state={containerState}
        style={containerStyle}
        {...handlers}
      >
        {/* Empty state — spans all columns, acts as the primary drop zone */}
        {!hasFiles && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop images here or click to browse"
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            style={emptyStateStyle}
          >
            <UploadIcon />
            <p style={emptyTitleStyle}>Drop images here</p>
            <p style={emptyHintStyle}>
              {accept.join(', ')}
              {maxSize !== undefined ? ` · up to ${formatBytes(maxSize)}` : ''}
              {maxFiles !== undefined ? ` · max ${maxFiles} files` : ''}
            </p>
          </div>
        )}

        {/* Image cells — each file gets its own grid cell */}
        {files.map((entry) =>
          animated ? renderCellAnimated(entry) : renderCellStatic(entry),
        )}

        {/* Add-more button — only shown when there are already files */}
        {hasFiles && (
          <button
            type="button"
            aria-label="Add more images"
            onClick={openPicker}
            style={addBtnStyle}
          >
            <svg
              viewBox="0 0 24 24"
              width={24}
              height={24}
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <line x1={12} y1={5} x2={12} y2={19} />
              <line x1={5} y1={12} x2={19} y2={12} />
            </svg>
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          hidden
          accept={accept.join(',')}
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

UploadGalleryGrid.displayName = 'UploadGalleryGrid';
