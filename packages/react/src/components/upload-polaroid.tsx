// UploadPolaroid — Pinterest/VSCO-inspired multi-file uploader where images
// appear as polaroid cards stacked with random rotation. New uploads "develop"
// from white to the actual image, mimicking the darkroom development process.

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadPolaroidProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
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

/**
 * Derive a stable rotation angle from the entry id string.
 * We hash the id characters to get a deterministic float in [-5, 5] degrees,
 * so rotation is consistent across re-renders without storing it in state.
 */
function idToRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  // Map to [-5, 5]
  return ((hash & 0xff) / 255) * 10 - 5;
}

// Cloud upload SVG icon for the empty state
const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

// Small checkmark for success overlay
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Small X for error overlay
const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const UploadPolaroid = forwardRef<HTMLDivElement, UploadPolaroidProps>(
  ({ route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, className }, ref) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Track blob URLs for cleanup
    const blobUrls = useRef<Map<string, string>>(new Map());

    // Cleanup all blob URLs on unmount
    useEffect(() => {
      const urls = blobUrls.current;
      return () => {
        for (const url of urls.values()) {
          URL.revokeObjectURL(url);
        }
      };
    }, []);

    const processFiles = useCallback(
      async (incoming: File[]) => {
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles - files.length) : incoming;
        const accepted: FileEntry[] = [];

        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
          } else {
            const id = makeId();
            // Create blob URL immediately so the polaroid image area can show
            // the photo the moment the file is selected
            if (f.type.startsWith('image/')) {
              const thumbnailUrl = URL.createObjectURL(f);
              blobUrls.current.set(id, thumbnailUrl);
              accepted.push({ id, file: f, status: 'idle', progress: 0, thumbnailUrl });
            } else {
              accepted.push({ id, file: f, status: 'idle', progress: 0 });
            }
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
      [client, route, accept, maxSize, maxFiles, files.length, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : 'idle';

    const MotionDiv = animated && m ? m.motion.div : null;

    // Container inline styles — all theming via CSS custom properties
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      minHeight: '200px',
      padding: '24px',
      position: 'relative',
      cursor: 'pointer',
      borderRadius: 'var(--uk-radius, 12px)',
      border: files.length === 0
        ? `2px dashed ${isDragging ? 'var(--uk-accent, #6366f1)' : 'rgba(255,255,255,0.12)'}`
        : 'none',
      background: isDragging
        ? 'rgba(99,102,241,0.05)'
        : 'transparent',
      transition: 'border-color 200ms ease-out, background 200ms ease-out',
      outline: 'none',
      alignItems: files.length === 0 ? 'center' : 'flex-start',
      justifyContent: files.length === 0 ? 'center' : 'flex-start',
    };

    // Empty state styles
    const emptyStateStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      color: isDragging
        ? 'var(--uk-accent, #6366f1)'
        : 'var(--uk-text-secondary, rgba(255,255,255,0.4))',
      transition: 'color 200ms ease-out',
      userSelect: 'none',
      pointerEvents: 'none',
    };

    const emptyLabelStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: 500,
      letterSpacing: '0.01em',
    };

    const emptySubLabelStyle: React.CSSProperties = {
      fontSize: '12px',
      opacity: 0.7,
    };

    const renderPolaroid = (entry: FileEntry, index: number) => {
      const rotation = idToRotation(entry.id);
      // On hover, fan cards out slightly by shifting each card based on index
      const fanOffset = isHovered ? index * 4 : 0;

      // "Developing" overlay opacity: starts at 1 (pure white), fades to 0 as
      // upload progresses past 50%. Images with status='idle' show full overlay.
      const developOpacity =
        entry.status === 'idle'
          ? 1
          : entry.status === 'success'
            ? 0
            : Math.max(0, 1 - entry.progress / 50);

      const polaroidStyle: React.CSSProperties = {
        // The white polaroid frame
        padding: '8px',
        paddingBottom: '32px',
        background: '#ffffff',
        borderRadius: '2px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        transform: `rotate(${rotation}deg) translateX(${fanOffset}px)`,
        transition: isHovered
          ? 'transform 200ms ease-out'
          : 'transform 250ms ease-out',
        position: 'relative',
        flexShrink: 0,
        // Stacking: later cards appear on top; hover lifts current
        zIndex: index,
      };

      const imageAreaStyle: React.CSSProperties = {
        width: '140px',
        height: '140px',
        overflow: 'hidden',
        position: 'relative',
        background: entry.thumbnailUrl ? '#f0ede8' : '#e8e5e0',
        // If there's no image, show a subtle texture pattern
        backgroundImage: entry.thumbnailUrl
          ? `url(${entry.thumbnailUrl})`
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };

      // The "developing" overlay — white layer that fades away as the upload progresses
      const developOverlayStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        background: '#ffffff',
        opacity: developOpacity,
        // Use a CSS transition for the development fade, controlled by progress changes
        transition: entry.status === 'uploading'
          ? 'opacity 0.8s ease-out'
          : 'opacity 1.5s ease-out',
        pointerEvents: 'none',
        // Subtle warm tint during development phase — like darkroom chemistry
        backgroundImage:
          developOpacity > 0.2
            ? 'linear-gradient(135deg, rgba(255,248,235,0.8) 0%, rgba(255,255,255,0.9) 100%)'
            : 'none',
      };

      // Status badge overlay (success/error)
      const statusBadgeStyle: React.CSSProperties = {
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entry.status === 'success' || entry.status === 'error' ? 1 : 0,
        transition: 'opacity 300ms ease-out',
        background:
          entry.status === 'success'
            ? 'rgba(34,197,94,0.9)'
            : entry.status === 'error'
              ? 'rgba(239,68,68,0.9)'
              : 'transparent',
        backdropFilter: 'blur(4px)',
        color: '#ffffff',
      };

      // Progress indicator at the bottom of image area (thin bar)
      const progressBarStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
        opacity: entry.status === 'uploading' ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      };

      const progressFillStyle: React.CSSProperties = {
        height: '100%',
        width: `${entry.progress}%`,
        background: 'var(--uk-accent, #6366f1)',
        transition: 'width 200ms ease-out',
      };

      // Caption area below photo
      const captionStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
      };

      const captionTextStyle: React.CSSProperties = {
        fontSize: '10px',
        color: '#555555',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '124px',
        fontFamily: '"Courier New", Courier, monospace',
        letterSpacing: '0.02em',
      };

      // No-image placeholder content (for non-image files)
      const placeholderStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        color: '#888888',
        fontSize: '10px',
        textAlign: 'center',
        padding: '8px',
      };

      const cardContent = (
        <>
          <div
            className="uk-polaroid__image-area"
            style={imageAreaStyle}
            aria-hidden="true"
          >
            {/* Non-image file placeholder */}
            {!entry.thumbnailUrl && (
              <div style={placeholderStyle}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{formatBytes(entry.file.size)}</span>
              </div>
            )}

            {/* Developing overlay — fades away as upload progresses */}
            <div
              className="uk-polaroid__develop-overlay"
              style={developOverlayStyle}
            />

            {/* Progress bar at bottom of image */}
            <div className="uk-polaroid__progress-bar" style={progressBarStyle}>
              <div style={progressFillStyle} />
            </div>

            {/* Status badge */}
            <div
              className="uk-polaroid__status-badge"
              style={statusBadgeStyle}
              aria-hidden="true"
            >
              {entry.status === 'success' && <CheckIcon />}
              {entry.status === 'error' && <XIcon />}
            </div>
          </div>

          {/* Polaroid caption area */}
          <div className="uk-polaroid__caption" style={captionStyle}>
            <span style={captionTextStyle} title={entry.file.name}>
              {entry.file.name}
            </span>
          </div>
        </>
      );

      const sharedProps = {
        className: 'uk-polaroid__card',
        'data-state': entry.status,
        role: 'progressbar' as const,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': entry.progress,
        'aria-label': `${entry.file.name} upload ${entry.status}`,
        // Prevent card click from propagating to container (would re-open picker)
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      };

      if (MotionDiv) {
        return (
          <MotionDiv
            key={entry.id}
            style={polaroidStyle}
            initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
            animate={{ opacity: 1, scale: 1, rotate: rotation }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            {...sharedProps}
          >
            {cardContent}
          </MotionDiv>
        );
      }

      return (
        <div key={entry.id} style={polaroidStyle} {...sharedProps}>
          {cardContent}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-polaroid', className)}
        data-uk-element="container"
        data-state={containerState}
        role="button"
        tabIndex={0}
        aria-label="Upload photos. Click or drop images here."
        style={containerStyle}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...handlers}
      >
        {files.length === 0 ? (
          // Empty / drop target state
          <div className="uk-polaroid__empty" style={emptyStateStyle}>
            <UploadIcon />
            <span style={emptyLabelStyle}>Drop photos here</span>
            <span style={emptySubLabelStyle}>or click to browse</span>
          </div>
        ) : (
          files.map((entry, i) => renderPolaroid(entry, i))
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
        />
      </div>
    );
  },
);

UploadPolaroid.displayName = 'UploadPolaroid';
