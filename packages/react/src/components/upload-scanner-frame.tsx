// UploadScannerFrame — Stripe Identity / banking KYC-inspired document scanner.
// A viewfinder with L-shaped corner brackets guides the user to align a document
// image for upload. Sweeping scan line animates while idle. Motion upgrade path
// via useOptionalMotion — spring-animated corners on drag-over when available,
// CSS transition fallback otherwise.

import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FrameAspect = 'portrait' | 'landscape' | 'square';

export type UploadScannerFrameProps = {
  /** Route name defined in your fileRouter */
  route: string;
  /** Accepted MIME types. Default: ['image/*'] */
  accept?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Frame aspect ratio. Default: 'landscape' */
  frameAspect?: FrameAspect;
  /** Label shown beneath the corner brackets. Default: 'Scan document' */
  label?: string;
  /** Called after a successful upload */
  onUploadComplete?: (result: UploadResult) => void;
  /** Called when an upload fails */
  onUploadError?: (error: Error) => void;
  /** Additional CSS class(es) for the outer wrapper */
  className?: string;
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

type FrameDimensions = { width: number; height: number };

function getFrameDimensions(aspect: FrameAspect): FrameDimensions {
  switch (aspect) {
    case 'portrait':
      return { width: 180, height: Math.round(180 * 1.4) }; // 180 × 252
    case 'square':
      return { width: 240, height: 240 };
    case 'landscape':
    default:
      return { width: 240, height: Math.round(240 / 1.6) }; // 240 × 150
  }
}

// ─── Keyframe injection (STYLE_ID guard — runs once) ─────────────────────────

const STYLE_ID = 'uk-scanner-frame-styles';

function injectKeyframes(frameHeight: number) {
  if (typeof document === 'undefined') return;
  // Remove previous injection if frame height changed (re-mount on aspect change)
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    // If the stored height matches, bail early
    if (existing.dataset.frameHeight === String(frameHeight)) return;
    existing.remove();
  }

  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.dataset.frameHeight = String(frameHeight);
  el.textContent = `
    @keyframes uk-scanner-sweep {
      0%   { transform: translateY(0); opacity: 0.7; }
      10%  { opacity: 0.7; }
      90%  { opacity: 0.7; }
      100% { transform: translateY(${frameHeight - 1}px); opacity: 0.7; }
    }
    @keyframes uk-scanner-corner-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes uk-scanner-check-pop {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

// ─── SVG assets ──────────────────────────────────────────────────────────────

const DOC_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ─── Corner bracket sub-component ────────────────────────────────────────────

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

function cornerStyle(
  pos: CornerPos,
  accentColor: string,
  isDragging: boolean,
  animated: boolean,
): React.CSSProperties {
  const ARM = 20;
  const THICK = 2;
  // Offset when dragging — corners expand outward 4px
  const offset = isDragging ? -4 : 0;

  const base: React.CSSProperties = {
    position: 'absolute',
    width: ARM,
    height: ARM,
    transition: animated ? undefined : 'all 0.2s ease-out',
  };

  const borderTop = `${THICK}px solid ${accentColor}`;
  const borderRight = `${THICK}px solid ${accentColor}`;
  const borderBottom = `${THICK}px solid ${accentColor}`;
  const borderLeft = `${THICK}px solid ${accentColor}`;

  switch (pos) {
    case 'tl':
      return {
        ...base,
        top: offset,
        left: offset,
        borderTop,
        borderLeft,
      };
    case 'tr':
      return {
        ...base,
        top: offset,
        right: offset,
        borderTop,
        borderRight,
      };
    case 'bl':
      return {
        ...base,
        bottom: offset,
        left: offset,
        borderBottom,
        borderLeft,
      };
    case 'br':
      return {
        ...base,
        bottom: offset,
        right: offset,
        borderBottom,
        borderRight,
      };
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export const UploadScannerFrame = forwardRef<HTMLDivElement, UploadScannerFrameProps>(
  (
    {
      route,
      accept = ['image/*'],
      maxSize,
      metadata,
      frameAspect = 'landscape',
      label = 'Scan document',
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { status, progress, error, result, isUploading, upload, reset } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const dims = getFrameDimensions(frameAspect);

    // Inject keyframes on mount / when frame height changes
    useEffect(() => {
      injectKeyframes(dims.height);
    }, [dims.height]);

    // Callbacks via useEffect
    useEffect(() => {
      if (status === 'success' && result) {
        onUploadComplete?.(result);
        const timer = setTimeout(() => {
          reset();
          setPreviewUrl(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [status, result, onUploadComplete, reset]);

    useEffect(() => {
      if (status === 'error' && error) {
        onUploadError?.(error);
      }
    }, [status, error, onUploadError]);

    // Cleanup object URL on unmount or when previewUrl changes
    useEffect(() => {
      return () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      };
    }, [previewUrl]);

    // ── File handling ────────────────────────────────────────────────────────

    function validateFile(file: File): string | null {
      if (accept && accept.length > 0) {
        const ok = accept.some((p) =>
          p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
        );
        if (!ok) return 'File type not accepted';
      }
      if (maxSize !== undefined && file.size > maxSize) {
        return `File exceeds maximum size`;
      }
      return null;
    }

    const processFile = useCallback(
      async (file: File) => {
        const reason = validateFile(file);
        if (reason) {
          onUploadError?.(new Error(reason));
          return;
        }
        // Generate preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        await upload(file, metadata);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [upload, metadata, accept, maxSize, onUploadError],
    );

    // ── Drag handlers ────────────────────────────────────────────────────────

    function onDragOver(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }

    function onDragLeave(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }

    function onDrop(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    }

    function openPicker() {
      if (isUploading) return;
      inputRef.current?.click();
    }

    // ── Derived state ────────────────────────────────────────────────────────

    const isSuccess = status === 'success';
    const isError = status === 'error';
    const isIdle = status === 'idle';

    // Corner accent: success=green, error=red, drag=brighter, default=accent
    const cornerAccent = isSuccess
      ? '#22c55e'
      : isError
        ? '#ef4444'
        : isDragging
          ? 'color-mix(in srgb, var(--uk-scanner-accent, var(--uk-primary, #6366f1)) 85%, white)'
          : 'var(--uk-scanner-accent, var(--uk-primary, #6366f1))';

    // Scan line only animates in idle state and when motion is permitted
    const scanLineAnimation =
      isIdle && !reduced ? 'uk-scanner-sweep 2.5s linear infinite' : 'none';

    // ── Render helpers ───────────────────────────────────────────────────────

    function renderCorners() {
      const positions: CornerPos[] = ['tl', 'tr', 'bl', 'br'];

      if (animated) {
        return positions.map((pos) => {
          const offset = isDragging ? -4 : 0;
          const isTop = pos === 'tl' || pos === 'tr';
          const isLeft = pos === 'tl' || pos === 'bl';

          return (
            <m.motion.div
              key={pos}
              aria-hidden="true"
              animate={{
                top: isTop ? offset : undefined,
                bottom: !isTop ? offset : undefined,
                left: isLeft ? offset : undefined,
                right: !isLeft ? offset : undefined,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                ...(isTop ? { top: 0 } : { bottom: 0 }),
                ...(isLeft ? { left: 0 } : { right: 0 }),
                borderTop: (pos === 'tl' || pos === 'tr')
                  ? `2px solid ${cornerAccent}`
                  : undefined,
                borderBottom: (pos === 'bl' || pos === 'br')
                  ? `2px solid ${cornerAccent}`
                  : undefined,
                borderLeft: (pos === 'tl' || pos === 'bl')
                  ? `2px solid ${cornerAccent}`
                  : undefined,
                borderRight: (pos === 'tr' || pos === 'br')
                  ? `2px solid ${cornerAccent}`
                  : undefined,
                transition: 'border-color 0.25s ease-out',
              }}
            />
          );
        });
      }

      return positions.map((pos) => (
        <div
          key={pos}
          aria-hidden="true"
          style={cornerStyle(pos, cornerAccent, isDragging, false)}
        />
      ));
    }

    function renderScanLine() {
      if (!isIdle) return null;

      if (animated) {
        return (
          <m.motion.div
            aria-hidden="true"
            animate={
              reduced
                ? {}
                : {
                    y: [0, dims.height - 1],
                    opacity: [0.7, 0.7],
                  }
            }
            transition={{
              duration: 2.5,
              ease: 'linear',
              repeat: Infinity,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(
                90deg,
                transparent 0%,
                var(--uk-scanner-accent, var(--uk-primary, #6366f1)) 20%,
                var(--uk-scanner-accent, var(--uk-primary, #6366f1)) 80%,
                transparent 100%
              )`,
              boxShadow: `0 0 8px 2px var(--uk-scanner-accent, var(--uk-primary, #6366f1))`,
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
        );
      }

      return (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(
              90deg,
              transparent 0%,
              var(--uk-scanner-accent, var(--uk-primary, #6366f1)) 20%,
              var(--uk-scanner-accent, var(--uk-primary, #6366f1)) 80%,
              transparent 100%
            )`,
            boxShadow: `0 0 8px 2px var(--uk-scanner-accent, var(--uk-primary, #6366f1))`,
            opacity: 0.6,
            animation: scanLineAnimation,
            pointerEvents: 'none',
          }}
        />
      );
    }

    function renderFrameContent() {
      if (isUploading && previewUrl) {
        return (
          <>
            {/* Document preview image */}
            <img
              src={previewUrl}
              alt="Document preview"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 4,
              }}
            />
            {/* Dark overlay with progress */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10,10,11,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'inherit',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {progress}%
              </span>
              {/* Mini progress bar */}
              <div
                style={{
                  width: '60%',
                  height: 3,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--uk-scanner-accent, var(--uk-primary, #6366f1))',
                    borderRadius: 99,
                    transition: 'width 0.2s ease-out',
                  }}
                />
              </div>
            </div>
          </>
        );
      }

      if (isSuccess) {
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                color: '#22c55e',
                animation: 'uk-scanner-check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
              }}
              dangerouslySetInnerHTML={{ __html: CHECK_SVG }}
            />
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: '#22c55e',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Verified
            </span>
          </div>
        );
      }

      if (isError) {
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div
              style={{ color: '#ef4444' }}
              dangerouslySetInnerHTML={{ __html: X_SVG }}
            />
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: '#ef4444',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                reset();
                setPreviewUrl(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  reset();
                  setPreviewUrl(null);
                }
              }}
            >
              Try again
            </span>
          </div>
        );
      }

      // Idle: document outline icon
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.12)',
          }}
          dangerouslySetInnerHTML={{ __html: DOC_ICON_SVG }}
        />
      );
    }

    // ── JSX ──────────────────────────────────────────────────────────────────

    return (
      <div
        ref={ref}
        className={mergeClass('uk-scanner', className)}
        data-uk-element="container"
        data-state={isUploading ? 'uploading' : status}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label={label}
        aria-busy={isUploading}
        style={{
          position: 'relative',
          background: 'var(--uk-scanner-bg, #0a0a0b)',
          padding: 24,
          borderRadius: 12,
          cursor: isUploading ? 'default' : 'pointer',
          textAlign: 'center',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          userSelect: 'none',
          outline: 'none',
          // Subtle border so the component has definition on light backgrounds
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {/* ── Scanner viewfinder frame ─────────────────────────────────────── */}
        <div
          className="uk-scanner__frame"
          aria-hidden="true"
          style={{
            position: 'relative',
            width: dims.width,
            height: dims.height,
            background: 'transparent',
            flexShrink: 0,
          }}
        >
          {/* Corner brackets */}
          {renderCorners()}

          {/* Scanning sweep line */}
          {renderScanLine()}

          {/* Frame content: idle icon / uploading preview / success / error */}
          {renderFrameContent()}
        </div>

        {/* ── Label (shown in idle + drag state, hidden during upload/result) ── */}
        {isIdle && (
          <span
            className="uk-scanner__label"
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--uk-text-primary, rgba(255,255,255,0.88))',
              letterSpacing: '-0.01em',
              lineHeight: 1.4,
            }}
          >
            {label}
          </span>
        )}

        {/* ── Instruction text ─────────────────────────────────────────────── */}
        {isIdle && (
          <p
            className="uk-scanner__instruction"
            style={{
              margin: 0,
              fontFamily: 'inherit',
              fontSize: 12,
              color: 'var(--uk-text-secondary, rgba(255,255,255,0.4))',
              lineHeight: 1.5,
            }}
          >
            Click or drop a document image
          </p>
        )}

        {/* ── File type hint ───────────────────────────────────────────────── */}
        {isIdle && accept && accept.length > 0 && (
          <p
            className="uk-scanner__hint"
            style={{
              margin: 0,
              fontFamily: 'inherit',
              fontSize: 11,
              color: 'var(--uk-text-secondary, rgba(255,255,255,0.25))',
              lineHeight: 1.4,
            }}
          >
            {accept.join(', ')}
          </p>
        )}

        {/* ── Drag-over accent overlay ──────────────────────────────────────── */}
        {isDragging && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: `1px solid var(--uk-scanner-accent, var(--uk-primary, #6366f1))`,
              boxShadow: `0 0 40px -12px var(--uk-scanner-accent, var(--uk-primary, #6366f1))`,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />
        )}

        {/* ── Hidden file input ─────────────────────────────────────────────── */}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept?.join(',')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processFile(file);
            e.target.value = '';
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadScannerFrame.displayName = 'UploadScannerFrame';
