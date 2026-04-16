// UploadButtonGradient — Instagram stories ring × TikTok energy.
// A conic gradient border that spins continuously around a dark inner button.
// The spin is driven by CSS keyframes on a ::before pseudo-element (works
// without @property registration). With Motion, we upgrade to a JS-driven
// rotate that can dynamically speed up during upload and freeze on success.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe, type MotionModule } from '../utils/motion-optional';
import { UploadBeam } from './upload-beam';
import type { UploadBeamState } from './upload-beam';

export type UploadButtonGradientProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Wrap with an animated border beam that reflects upload state. */
  beam?: boolean;
};

// Same upload icon used across the SDK button family.
const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;

// Injected once into <head>. Lives outside components so it only runs once.
const STYLE_ID = 'uk-btn-gradient-styles';
const CSS = /* css */ `
  /* ─── Layout ──────────────────────────────────────────────────────────── */
  .uk-btn-gradient-wrap {
    display: inline-flex;
    position: relative;
    padding: 2px;
    border-radius: 12px;
    /* Fallback bg while the pseudo-element is positioned */
    background: transparent;
    cursor: pointer;
  }

  /* ─── Spinning gradient ring (pseudo-element trick) ───────────────────── */
  /* We can't animate a CSS custom property without @property, so instead we
     render the full conic gradient oversized in ::before and rotate *that*
     element. The parent clips it to the 2px ring shape via overflow:hidden. */
  .uk-btn-gradient-wrap::before {
    content: '';
    position: absolute;
    inset: -50%;            /* oversized so corners stay covered during rotation */
    border-radius: inherit;
    background: conic-gradient(
      from 0deg,
      var(--uk-gradient-from, #f97316),   /* orange */
      var(--uk-gradient-via, #ec4899),    /* pink */
      var(--uk-gradient-to,  #8b5cf6),    /* violet */
      var(--uk-gradient-from, #f97316)    /* loop back */
    );
    animation: uk-gradient-spin var(--uk-spin-duration, 3s) linear infinite;
    z-index: 0;
  }

  /* When motion JS takes over, the animation-name is cleared to hand off
     control to the motion.div wrapper's rotate transform. */
  .uk-btn-gradient-wrap[data-motion-controlled]::before {
    animation: none;
    inset: 0;               /* motion wrapper handles clipping */
    border-radius: inherit;
  }

  /* Clip the ::before so only a 2px ring shows. */
  .uk-btn-gradient-wrap {
    overflow: hidden;
  }

  /* ─── Inner dark surface ──────────────────────────────────────────────── */
  .uk-btn-gradient {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 10px;                  /* 12px outer − 2px padding */
    background: var(--uk-bg, #0a0a0b);
    color: var(--uk-text, #fafafa);
    font-size: 14px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
    border: none;
    outline: none;
    cursor: pointer;
    width: 100%;
    user-select: none;
    transition:
      background 200ms ease-out,
      color 200ms ease-out,
      opacity 200ms ease-out;
    -webkit-font-smoothing: antialiased;
  }

  /* Hover: let the gradient bleed through the inner bg for depth */
  .uk-btn-gradient-wrap:not([data-state="uploading"]):not(:has(.uk-btn-gradient:disabled)):hover .uk-btn-gradient {
    background: color-mix(in srgb, var(--uk-bg, #0a0a0b) 82%, transparent);
  }

  /* Gradient text on hover (the gradient is from the ::before behind the label) */
  .uk-btn-gradient-wrap:not([data-state="uploading"]):not(:has(.uk-btn-gradient:disabled)):hover .uk-btn-gradient {
    color: var(--uk-text-hover, #fafafa);
  }

  /* Uploading state: slightly faster spin handled by --uk-spin-duration override */
  .uk-btn-gradient-wrap[data-state="uploading"] {
    --uk-spin-duration: 1.1s;
  }

  /* Success: stop the ring — gradient freezes in place */
  .uk-btn-gradient-wrap[data-state="success"]::before {
    animation-play-state: paused;
  }

  /* Disabled: dim */
  .uk-btn-gradient:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Focus-visible ring passes through to the outer wrapper */
  .uk-btn-gradient:focus-visible {
    outline: 2px solid var(--uk-gradient-via, #ec4899);
    outline-offset: 4px;
  }

  /* ─── Keyframes ───────────────────────────────────────────────────────── */
  @keyframes uk-gradient-spin {
    to { transform: rotate(360deg); }
  }

  /* ─── Reduced motion: stop the ring entirely ──────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .uk-btn-gradient-wrap::before {
      animation: none;
    }
  }
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ─── Shared prop shapes ──────────────────────────────────────────────────────

type SharedState = {
  status: string;
  progress: number;
  isUploading: boolean;
  disabled: boolean;
  label: React.ReactNode;
  className?: string;
  accept?: string[];
};

type SharedHandlers = {
  onClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

// ─── Motion-enhanced variant ─────────────────────────────────────────────────
// With motion available we rotate the entire wrapper div (which clips the
// ::before pseudo that holds the gradient) so we get spring-like speed changes.

function GradientAnimated(
  props: SharedState &
    SharedHandlers & {
      m: MotionModule;
      forwardedRef: React.Ref<HTMLButtonElement>;
      inputRef: React.RefObject<HTMLInputElement | null>;
    },
) {
  const { m, forwardedRef, inputRef, status, progress, isUploading, disabled, label, className, accept, onClick, onFileChange } = props;

  // Rotate a wrapper div that contains the conic-gradient pseudo-element.
  // We override the CSS animation on the pseudo and let motion drive rotation.
  // Speed: idle = 3s / rev ≈ 120deg/s, uploading = 1s / rev ≈ 360deg/s.
  // We express this as a duration on the animate transition.

  const spinDuration = isUploading ? 1.0 : status === 'success' ? 0 : 3;

  const MotionDiv = m.motion.div;

  return (
    <>
      {/* Outer clipping wrapper — does NOT rotate, just clips */}
      <div
        className={mergeClass('uk-btn-gradient-wrap', className)}
        data-state={status}
        data-motion-controlled=""
        style={{ position: 'relative', display: 'inline-flex', overflow: 'hidden', borderRadius: 12, padding: 2 }}
      >
        {/* This div IS the spinning gradient ring. Oversized so corners fill. */}
        <MotionDiv
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-50%',
            borderRadius: 'inherit',
            background: 'conic-gradient(from 0deg, var(--uk-gradient-from, #f97316), var(--uk-gradient-via, #ec4899), var(--uk-gradient-to, #8b5cf6), var(--uk-gradient-from, #f97316))',
            zIndex: 0,
          }}
          animate={
            status === 'success'
              ? { rotate: 0 }        // freeze
              : { rotate: 360 }
          }
          transition={
            status === 'success'
              ? { duration: 0 }
              : {
                  duration: spinDuration,
                  repeat: Infinity,
                  ease: 'linear',
                  repeatType: 'loop',
                }
          }
        />

        {/* Inner dark button surface */}
        <button
          ref={forwardedRef}
          type="button"
          className="uk-btn-gradient"
          data-uk-element="button"
          data-state={status}
          disabled={disabled || isUploading}
          aria-busy={isUploading}
          aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
          onClick={onClick}
        >
          <span aria-hidden="true" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }} />
          <span>{label}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept?.join(',')}
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </>
  );
}

// ─── CSS-only (static) variant ───────────────────────────────────────────────

function GradientStatic(
  props: SharedState &
    SharedHandlers & {
      forwardedRef: React.Ref<HTMLButtonElement>;
      inputRef: React.RefObject<HTMLInputElement | null>;
    },
) {
  const { forwardedRef, inputRef, status, progress, isUploading, disabled, label, className, accept, onClick, onFileChange } = props;

  return (
    <>
      <div
        className={mergeClass('uk-btn-gradient-wrap', className)}
        data-state={status}
      >
        <button
          ref={forwardedRef}
          type="button"
          className="uk-btn-gradient"
          data-uk-element="button"
          data-state={status}
          disabled={disabled || isUploading}
          aria-busy={isUploading}
          aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
          onClick={onClick}
        >
          <span aria-hidden="true" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }} />
          <span>{label}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept?.join(',')}
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export const UploadButtonGradient = forwardRef<HTMLButtonElement, UploadButtonGradientProps>(
  (
    { route, accept, maxSize, metadata, onUploadComplete, onUploadError, disabled = false, className, children, beam },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Inject CSS once per document.
    useEffect(() => {
      injectStyles();
    }, []);

    useEffect(() => {
      if (status === 'success' && result) onUploadComplete?.(result);
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) onUploadError?.(error);
    }, [status, error, onUploadError]);

    function handleClick() {
      if (disabled || isUploading) return;
      inputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (maxSize !== undefined && file.size > maxSize) {
        onUploadError?.(new Error(`File exceeds the ${maxSize} byte limit.`));
        return;
      }
      await upload(file, metadata);
    }

    // Label: progress during upload, "Done" on success, custom children or default otherwise.
    const label =
      isUploading
        ? `Uploading ${progress}%`
        : status === 'success'
          ? 'Done'
          : (children ?? 'Upload file');

    // Map internal status to UploadBeamState
    const beamState: UploadBeamState =
      status === 'uploading' ? 'uploading'
      : status === 'success' ? 'complete'
      : status === 'error' ? 'error'
      : 'idle';

    const shared: SharedState & SharedHandlers = {
      status,
      progress,
      isUploading,
      disabled,
      label,
      ...(className !== undefined ? { className } : {}),
      ...(accept !== undefined ? { accept } : {}),
      onClick: handleClick,
      onFileChange: handleFileChange,
    };

    const content = animated && m
      ? <GradientAnimated {...shared} m={m} forwardedRef={ref} inputRef={inputRef} />
      : <GradientStatic {...shared} forwardedRef={ref} inputRef={inputRef} />;

    if (beam) {
      return <UploadBeam state={beamState}>{content}</UploadBeam>;
    }

    return content;
  },
);

UploadButtonGradient.displayName = 'UploadButtonGradient';
