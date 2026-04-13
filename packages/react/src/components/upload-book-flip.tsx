// UploadBookFlip — Issuu/Apple Books-inspired document uploader. Renders a 3D
// book with realistic spine, stacked pages, and a dramatic page-flip animation
// during upload. Progress is narrated as "page N of M" for a playful reading
// metaphor. All styling via inline styles — zero Tailwind dependency (SDK constraint).

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadBookFlipProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

// Total fake "pages" we display during the progress metaphor
const TOTAL_PAGES = 12;

// SVG icons — inline so the SDK ships zero icon-font dependency

const UploadDocIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.8)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.95)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.95)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ---------------------------------------------------------------------------
// Keyframe injection
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = 'uk-book-flip-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes uk-book-page-flip {
      0%   { transform: rotateY(0deg);    opacity: 1; }
      40%  { transform: rotateY(-90deg);  opacity: 0.6; }
      100% { transform: rotateY(-180deg); opacity: 0; }
    }
    @keyframes uk-book-cover-idle {
      0%   { transform: rotateY(-5deg); }
      50%  { transform: rotateY(-8deg); }
      100% { transform: rotateY(-5deg); }
    }
    @keyframes uk-book-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center;  }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single page layer — visible from the right edge of the book as paper stack */
function PageLayer({
  offset,
  isFlipping,
  animated,
  flipDelay,
}: {
  offset: number;
  isFlipping: boolean;
  animated: boolean;
  flipDelay: number;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: offset,
    bottom: offset,
    // Pages peek out from the right side of the book cover
    left: 2 + offset,
    right: -4 - offset * 0.5,
    background: `color-mix(in srgb, var(--uk-bg-primary, #fafafa) ${90 - offset * 5}%, var(--uk-bg-secondary, #e5e7eb))`,
    borderRadius: '0 3px 3px 0',
    // Pages cast a subtle shadow on each other
    boxShadow: `1px 0 3px rgba(0,0,0,${0.12 + offset * 0.04})`,
    transformOrigin: 'left center',
    // When Motion is available, it will override the transform. When not,
    // CSS animation runs for active pages.
    ...(isFlipping && !animated
      ? {
          animation: `uk-book-page-flip 0.5s ease-in-out ${flipDelay}ms forwards`,
        }
      : {}),
  };

  return <div aria-hidden="true" style={baseStyle} />;
}

/** Thin spine strip on the left edge of the book */
function BookSpine({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        // The spine is 8px wide and sits flush with the left edge.
        // transform rotateY(90deg) folds it into the 3D left face.
        left: 0,
        top: 0,
        bottom: 0,
        width: 8,
        background: color,
        // Slightly darker than the cover to simulate the fold
        filter: 'brightness(0.65)',
        transform: 'rotateY(90deg)',
        transformOrigin: 'left center',
        // Flat line on the spine for subtle texture
        backgroundImage:
          'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        borderRadius: '1px 0 0 1px',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const UploadBookFlip = forwardRef<HTMLDivElement, UploadBookFlipProps>(
  (
    {
      route,
      accept = ['application/pdf', 'image/*'],
      maxSize,
      metadata,
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error } = useUploadKit(route);
    const [file, setFile] = useState<File | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Inject CSS keyframes once on mount
    useEffect(() => {
      injectKeyframes();
    }, []);

    // Callback effects — run in useEffect as required by the pattern
    useEffect(() => {
      if (status === 'success' && result) {
        onUploadComplete?.(result);
      }
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) {
        onUploadError?.(error);
      }
    }, [status, error, onUploadError]);

    // Derived state
    const isIdle = status === 'idle';
    const isUploading = status === 'uploading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    // Fake "page" count for the progress metaphor (1-based)
    const currentPage = Math.max(1, Math.round((progress / 100) * TOTAL_PAGES));

    // Cover color — accent in idle/uploading, green on success, red on error
    const coverColor = isSuccess
      ? 'var(--uk-success, #16a34a)'
      : isError
        ? 'var(--uk-error, #dc2626)'
        : 'var(--uk-primary, var(--uk-accent, #6366f1))';

    // -----------------------------------------------------------------------
    // Event handlers
    // -----------------------------------------------------------------------

    function openPicker() {
      if (isUploading) return;
      inputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const picked = e.target.files?.[0];
      e.target.value = '';
      if (!picked) return;

      if (maxSize !== undefined && picked.size > maxSize) {
        onUploadError?.(new Error(`"${picked.name}" exceeds the ${formatBytes(maxSize)} limit.`));
        return;
      }

      const okType =
        !accept || accept.length === 0
          ? true
          : accept.some((p) =>
              p.endsWith('/*') ? picked.type.startsWith(p.slice(0, -1)) : picked.type === p,
            );

      if (!okType) {
        onUploadError?.(new Error(`"${picked.name}" — file type not allowed.`));
        return;
      }

      setFile(picked);
      await upload(picked, metadata);
    }

    // -----------------------------------------------------------------------
    // Style system
    // -----------------------------------------------------------------------

    // Outer wrapper — provides perspective context for all 3D children
    const wrapperStyle: React.CSSProperties = {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      cursor: isUploading ? 'default' : 'pointer',
      userSelect: 'none',
      outline: 'none',
    };

    // Stage — the perspective container; clicking opens the file picker
    const stageStyle: React.CSSProperties = {
      perspective: '1000px',
      perspectiveOrigin: '60% 50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 200,
      height: 240,
    };

    // Book body — the 3D-transformed container for cover + spine + pages
    const bookStyle: React.CSSProperties = {
      position: 'relative',
      width: 160,
      height: 200,
      transformStyle: 'preserve-3d',
      // Idle: gentle angle for depth; on hover: slightly more open
      transform: `rotateY(${isHovered && isIdle ? -12 : -5}deg) rotateX(2deg)`,
      transition: animated ? undefined : 'transform 0.3s ease',
    };

    // Front cover of the book
    const coverStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      // Spine is on the left: hard corner left, rounded right
      borderRadius: '0 4px 4px 0',
      background: coverColor,
      // Depth shadow — deeper on the right to simulate light from upper-left
      boxShadow:
        '4px 6px 24px rgba(0,0,0,0.35), 2px 2px 0 rgba(255,255,255,0.04) inset, -2px 0 0 rgba(0,0,0,0.25) inset',
      // Linen/canvas texture overlay — very subtle so cover color still reads
      backgroundImage: `
        repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0) 0px,
          rgba(0,0,0,0) 3px,
          rgba(0,0,0,0.04) 3px,
          rgba(0,0,0,0.04) 4px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(255,255,255,0) 0px,
          rgba(255,255,255,0) 5px,
          rgba(255,255,255,0.025) 5px,
          rgba(255,255,255,0.025) 6px
        )
      `,
      overflow: 'hidden',
      // Shimmer effect during upload (CSS fallback)
      ...(isUploading && !animated
        ? {
            backgroundSize: '200% 100%',
            animation: 'uk-book-shimmer 2s linear infinite',
          }
        : {}),
    };

    // Content area inside the cover — icon + label
    const coverContentStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '0 12px',
    };

    // Title text on the cover
    const coverTitleStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.92)',
      textAlign: 'center',
      letterSpacing: '0.01em',
      lineHeight: 1.35,
      // Truncate long filenames to two lines
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      maxWidth: '100%',
    };

    // Subtle horizontal rule below icon — classic book chapter divider feel
    const dividerStyle: React.CSSProperties = {
      width: 32,
      height: 1,
      background: 'rgba(255,255,255,0.25)',
      borderRadius: 1,
    };

    // "Click to upload" prompt below the book
    const promptStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--uk-text-primary, #fafafa)',
      letterSpacing: '0.01em',
    };

    // File meta (name + size) below the book
    const fileNameStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--uk-text-primary, #fafafa)',
      maxWidth: 200,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    };

    const fileSizeStyle: React.CSSProperties = {
      fontSize: 12,
      color: 'var(--uk-text-secondary, #71717a)',
      textAlign: 'center',
    };

    const statusTextStyle: React.CSSProperties = {
      fontSize: 12,
      color: isSuccess
        ? 'var(--uk-success, #16a34a)'
        : isError
          ? 'var(--uk-error, #dc2626)'
          : 'var(--uk-text-secondary, #71717a)',
      textAlign: 'center',
      fontWeight: isSuccess || isError ? 500 : 400,
    };

    // Focus ring for keyboard navigation
    const focusRingStyle: React.CSSProperties = {
      position: 'absolute',
      inset: -4,
      borderRadius: 8,
      border: '2px solid var(--uk-accent, #6366f1)',
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 0.15s ease',
    };

    // -----------------------------------------------------------------------
    // Cover label
    // -----------------------------------------------------------------------

    const coverLabel = file
      ? file.name.replace(/\.[^.]+$/, '') // strip extension for a cleaner title
      : 'Document';

    // -----------------------------------------------------------------------
    // Status text
    // -----------------------------------------------------------------------

    let statusText: string;
    if (isUploading) {
      statusText = `Page ${currentPage} of ${TOTAL_PAGES}…`;
    } else if (isSuccess) {
      statusText = 'Upload complete';
    } else if (isError) {
      statusText = error?.message ?? 'Upload failed';
    } else {
      statusText = accept?.includes('application/pdf') ? 'PDF, images accepted' : 'Click to select a file';
    }

    // -----------------------------------------------------------------------
    // Page flip animation — Motion vs CSS
    // -----------------------------------------------------------------------

    // We render 3 flipping page layers during upload.
    // Each flips in sequence: pages 0, 1, 2 with staggered delays.
    function renderPageLayers() {
      return [0, 1, 2].map((i) => {
        // Stagger: each layer flips 80ms after the previous
        const flipDelay = i * 80;

        if (animated && isUploading) {
          // Motion-powered continuous rotation — using a loop via repeatType
          const MotionDiv = m!.motion.div as React.ElementType;
          return (
            <MotionDiv
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: i,
                bottom: i,
                left: 2 + i,
                right: -4 - i * 0.5,
                background: `color-mix(in srgb, var(--uk-bg-primary, #fafafa) ${90 - i * 5}%, var(--uk-bg-secondary, #e5e7eb))`,
                borderRadius: '0 3px 3px 0',
                boxShadow: `1px 0 3px rgba(0,0,0,${0.12 + i * 0.04})`,
                transformOrigin: 'left center',
              }}
              animate={{
                rotateY: [0, -180],
                opacity: [1, 0],
              }}
              transition={{
                duration: 0.6,
                delay: flipDelay / 1000,
                repeat: Infinity,
                // Gap between flip cycles — longer pause so it reads as "page turns"
                repeatDelay: 1.5,
                ease: 'easeInOut',
              }}
            />
          );
        }

        return (
          <PageLayer
            key={i}
            offset={i}
            isFlipping={isUploading}
            animated={animated}
            flipDelay={flipDelay}
          />
        );
      });
    }

    // -----------------------------------------------------------------------
    // Book component — Motion vs CSS for the idle float
    // -----------------------------------------------------------------------

    function renderBook() {
      const bookContent = (
        <>
          {/* Page stack — rendered behind the cover */}
          {renderPageLayers()}

          {/* Spine — 3D left face */}
          <BookSpine color={coverColor} />

          {/* Front cover */}
          <div style={coverStyle} aria-hidden="true">
            <div style={coverContentStyle}>
              {isSuccess ? (
                <CheckIcon />
              ) : isError ? (
                <ErrorIcon />
              ) : (
                <UploadDocIcon />
              )}
              <div style={dividerStyle} />
              <span style={coverTitleStyle}>{coverLabel}</span>
            </div>
          </div>
        </>
      );

      // Animated book with gentle idle float
      if (animated && isIdle) {
        const MotionDiv = m!.motion.div as React.ElementType;
        return (
          <MotionDiv
            style={bookStyle}
            animate={{
              rotateY: isHovered ? -12 : -5,
              rotateX: 2,
              y: isHovered ? -4 : 0,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {bookContent}
          </MotionDiv>
        );
      }

      // Success bounce
      if (animated && isSuccess) {
        const MotionDiv = m!.motion.div as React.ElementType;
        return (
          <MotionDiv
            style={bookStyle}
            animate={{ rotateY: -5, rotateX: 2, y: [0, -8, 0] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {bookContent}
          </MotionDiv>
        );
      }

      return <div style={bookStyle}>{bookContent}</div>;
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={isUploading ? statusText : 'Upload document — click to select'}
        className={mergeClass('uk-book-flip', className)}
        style={wrapperStyle}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={(e) => {
          const ring = e.currentTarget.querySelector<HTMLElement>('.uk-book-flip__focus-ring');
          if (ring) ring.style.opacity = '1';
        }}
        onBlur={(e) => {
          const ring = e.currentTarget.querySelector<HTMLElement>('.uk-book-flip__focus-ring');
          if (ring) ring.style.opacity = '0';
        }}
        data-uk-element="book-flip"
        data-status={status}
      >
        {/* Keyboard focus ring */}
        <span
          className="uk-book-flip__focus-ring"
          aria-hidden="true"
          style={focusRingStyle}
        />

        {/* 3D book stage */}
        <div className="uk-book-flip__stage" style={stageStyle}>
          {renderBook()}
        </div>

        {/* Metadata below the book */}
        <div
          className="uk-book-flip__meta"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          aria-live="polite"
        >
          {file ? (
            <>
              <span className="uk-book-flip__filename" style={fileNameStyle} title={file.name}>
                {file.name}
              </span>
              <span className="uk-book-flip__filesize" style={fileSizeStyle}>
                {formatBytes(file.size)}
              </span>
            </>
          ) : (
            <span className="uk-book-flip__prompt" style={promptStyle}>
              Click to upload
            </span>
          )}
          <span className="uk-book-flip__status" style={statusTextStyle}>
            {statusText}
          </span>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept?.join(',')}
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadBookFlip.displayName = 'UploadBookFlip';
