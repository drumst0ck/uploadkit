// UploadButtonPulse — Apple-inspired calm, minimal upload button.
// Soft radial pulse while idle, satisfying squeeze on press, smooth progress label.
// Static CSS keyframe fallback when Motion is unavailable or reduced-motion is preferred.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';
import { UploadBeam } from './upload-beam';
import type { UploadBeamState } from './upload-beam';

export type UploadButtonPulseProps = {
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

// Cloud-upload icon — matches the shimmer component's icon path set.
const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;

// Keyframes injected once into the document for the CSS-only pulse fallback.
// The animation produces the same expanding-ring effect as the Motion variant
// without any runtime dependency.
const CSS_KEYFRAMES = `
@keyframes uk-btn-pulse-ring {
  0%   { box-shadow: 0 0 0 0px rgba(0, 112, 243, 0.30); }
  50%  { box-shadow: 0 0 0 12px rgba(0, 112, 243, 0.00); }
  100% { box-shadow: 0 0 0 0px rgba(0, 112, 243, 0.00); }
}
`;

let cssInjected = false;

function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.ukBtnPulse = '';
  style.textContent = CSS_KEYFRAMES;
  document.head.appendChild(style);
  cssInjected = true;
}

export const UploadButtonPulse = forwardRef<HTMLButtonElement, UploadButtonPulseProps>(
  (
    { route, accept, maxSize, metadata, onUploadComplete, onUploadError, disabled = false, className, children, beam },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    // Use Motion only when it's available and the user hasn't requested reduced motion.
    const animated = m !== null && !reduced;

    // Inject the CSS-only keyframe once when falling back to static animation.
    useEffect(() => {
      if (!animated) injectCSS();
    }, [animated]);

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
      // Reset so the same file can be selected again.
      e.target.value = '';
      if (!file) return;
      if (maxSize !== undefined && file.size > maxSize) {
        onUploadError?.(new Error(`File exceeds the ${maxSize} byte limit.`));
        return;
      }
      await upload(file, metadata);
    }

    const isSuccess = status === 'success';
    const label = isSuccess
      ? 'Done ✓'
      : isUploading
        ? `Uploading ${progress}%`
        : (children ?? 'Upload file');

    // Base inline styles — CSS custom property driven so consumers can theme freely.
    // Using inline styles for the core shape keeps the component self-contained;
    // consumers who need full Tailwind control can pass a `className`.
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: '999px',
      border: 'none',
      cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1,
      letterSpacing: '-0.01em',
      // Background transitions to success green briefly, then stays primary.
      backgroundColor: isSuccess ? 'var(--uk-success, #22c55e)' : 'var(--uk-primary, #0070f3)',
      color: '#fff',
      opacity: disabled && !isUploading ? 0.5 : 1,
      position: 'relative',
      overflow: 'visible',
      transition: 'background-color 0.4s ease, opacity 0.2s ease',
      // Uploading state: pulse pauses — the label itself communicates progress.
      ...(!animated && !isUploading && !isSuccess
        ? { animation: 'uk-btn-pulse-ring 2.4s ease-in-out infinite' }
        : {}),
    };

    // Motion-powered box-shadow pulse sequence. Three keyframes: start tight →
    // expand + fade → collapse back. Repeating every 2.4 s feels calm and Apple-like.
    const pulseBoxShadow = [
      '0 0 0 0px rgba(0, 112, 243, 0.30)',
      '0 0 0 12px rgba(0, 112, 243, 0.00)',
      '0 0 0 0px rgba(0, 112, 243, 0.00)',
    ];

    const iconSpan = (
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }}
      />
    );

    // Map internal status to UploadBeamState
    const beamState: UploadBeamState =
      status === 'uploading' ? 'uploading'
      : status === 'success' ? 'complete'
      : status === 'error' ? 'error'
      : 'idle';

    let content: React.ReactNode;

    if (animated) {
      // Motion variant: whileTap squeeze + idle box-shadow pulse.
      content = (
        <>
          <m.motion.button
            ref={ref}
            type="button"
            className={mergeClass('uk-btn-pulse', className)}
            data-uk-element="button"
            data-state={status}
            disabled={disabled || isUploading}
            aria-busy={isUploading}
            aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
            onClick={handleClick}
            style={baseStyle}
            // Squeeze on press — the Apple "satisfying click" feel.
            whileTap={{ scale: 0.95 }}
            // Pulse only while idle; stops during upload/success to signal a state change.
            animate={
              !isUploading && !isSuccess
                ? { boxShadow: pulseBoxShadow }
                : { boxShadow: '0 0 0 0px rgba(0, 112, 243, 0)' }
            }
            transition={
              !isUploading && !isSuccess
                ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3, ease: 'easeOut' }
            }
          >
            {iconSpan}
            <span className="uk-btn-pulse__label">{label}</span>
          </m.motion.button>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept={accept?.join(',')}
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
          />
        </>
      );
    } else {
      // Static / reduced-motion variant: CSS keyframe fallback, no Motion dependency.
      content = (
        <>
          <button
            ref={ref}
            type="button"
            className={mergeClass('uk-btn-pulse', className)}
            data-uk-element="button"
            data-state={status}
            disabled={disabled || isUploading}
            aria-busy={isUploading}
            aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
            onClick={handleClick}
            style={baseStyle}
          >
            {iconSpan}
            <span className="uk-btn-pulse__label">{label}</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept={accept?.join(',')}
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
          />
        </>
      );
    }

    if (beam) {
      return <UploadBeam state={beamState}>{content}</UploadBeam>;
    }

    return content;
  },
);

UploadButtonPulse.displayName = 'UploadButtonPulse';
