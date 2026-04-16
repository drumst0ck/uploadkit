// UploadButtonBeam — a beam-first upload button where the animated border beam
// IS the visual identity. Clean, minimal surface; the beam effect activates
// automatically during uploads without needing a `beam` prop toggle.

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { UploadBeam } from './upload-beam';
import type { UploadBeamState } from './upload-beam';

export type UploadButtonBeamProps = {
  /** Route name defined in your fileRouter (e.g. 'avatars', 'documents') */
  route: string;
  /** Accepted MIME types (e.g. ['image/jpeg', 'image/png']) */
  accept?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Called after a successful upload */
  onUploadComplete?: (result: UploadResult) => void;
  /** Called when an upload fails */
  onUploadError?: (error: Error) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Additional CSS class(es) for the outer wrapper */
  className?: string;
  /** Custom button label; omit to use the built-in state labels */
  children?: React.ReactNode;
};

// Cloud-upload icon — consistent with the SDK button family.
const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const RETRY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;

const STYLE_ID = 'uk-btn-beam-styles';
const CSS = /* css */ `
  .uk-btn-beam-wrap {
    display: inline-flex;
    position: relative;
  }

  .uk-btn-beam {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: var(--uk-radius, 12px);
    background: var(--uk-beam-bg, rgba(10, 10, 11, 0.9));
    color: var(--uk-beam-text, #fafafa);
    border: 1px solid var(--uk-beam-border, rgba(255, 255, 255, 0.08));
    font-family: var(--uk-font, inherit);
    font-size: 14px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
    cursor: pointer;
    user-select: none;
    position: relative;
    outline: none;
    transition:
      border-color 200ms ease-out,
      background 200ms ease-out,
      color 200ms ease-out,
      opacity 200ms ease-out;
    -webkit-font-smoothing: antialiased;
  }

  .uk-btn-beam:hover:not(:disabled) {
    border-color: var(--uk-beam-border-hover, rgba(255, 255, 255, 0.16));
  }

  .uk-btn-beam:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .uk-btn-beam:focus-visible {
    outline: 2px solid var(--uk-accent, #6366f1);
    outline-offset: 2px;
  }

  /* Uploading state — subtle background shift */
  .uk-btn-beam[data-state="uploading"] {
    border-color: rgba(99, 102, 241, 0.2);
  }

  /* Success state */
  .uk-btn-beam[data-state="success"] {
    border-color: rgba(34, 197, 94, 0.25);
    color: var(--uk-beam-success-text, #4ade80);
  }

  /* Error state */
  .uk-btn-beam[data-state="error"] {
    border-color: rgba(239, 68, 68, 0.25);
    color: var(--uk-beam-error-text, #f87171);
  }

  .uk-btn-beam__retry {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
    color: var(--uk-beam-text, #fafafa);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease-out, border-color 150ms ease-out;
  }

  .uk-btn-beam__retry:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }

  /* Screen-reader only */
  .uk-btn-beam-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * UploadButtonBeam — a beam-first upload button.
 *
 * Unlike `<UploadButton beam>` where the beam is an optional add-on,
 * `UploadButtonBeam` is designed around the beam effect as its primary
 * visual identity. The beam activates automatically during uploads --
 * no prop toggle needed.
 *
 * The button surface is intentionally minimal (dark, thin border) so the
 * beam animation takes center stage during the upload lifecycle.
 *
 * @example
 * ```tsx
 * <UploadButtonBeam
 *   route="imageUploader"
 *   onUploadComplete={(result) => console.log(result.url)}
 * />
 * ```
 */
export const UploadButtonBeam = forwardRef<HTMLButtonElement, UploadButtonBeamProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      onUploadComplete,
      onUploadError,
      disabled = false,
      className,
      children,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading, reset } =
      useUploadKit(route);

    // Track the "Uploaded" flash state before auto-resetting
    const [showComplete, setShowComplete] = useState(false);

    // Inject CSS once per document.
    useEffect(() => {
      injectStyles();
    }, []);

    // Wire onUploadComplete callback + auto-reset after success flash
    useEffect(() => {
      if (status === 'success' && result) {
        onUploadComplete?.(result);
        setShowComplete(true);
        const timer = setTimeout(() => {
          setShowComplete(false);
          reset();
        }, 2000);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [status, result, onUploadComplete, reset]);

    // Wire onUploadError callback
    useEffect(() => {
      if (status === 'error' && error) {
        onUploadError?.(error);
      }
    }, [status, error, onUploadError]);

    function handleClick() {
      if (disabled || isUploading) return;
      // If in error state, clicking the main button also retries (opens picker)
      inputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (maxSize !== undefined && file.size > maxSize) {
        onUploadError?.(
          new Error(`File exceeds the ${maxSize} byte limit. Choose a smaller file.`),
        );
        return;
      }
      await upload(file, metadata);
    }

    function handleRetry(e: React.MouseEvent | React.KeyboardEvent) {
      e.stopPropagation();
      reset();
      inputRef.current?.click();
    }

    function handleRetryKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRetry(e);
      }
    }

    // Map internal status to UploadBeamState
    const beamState: UploadBeamState =
      status === 'uploading'
        ? 'uploading'
        : status === 'success' || showComplete
          ? 'complete'
          : status === 'error'
            ? 'error'
            : 'idle';

    // Determine label content
    let icon: string;
    let label: React.ReactNode;
    const castStatus = status as UploadStatus;

    if (castStatus === 'uploading') {
      icon = UPLOAD_ICON;
      label = `Uploading ${progress}%`;
    } else if (castStatus === 'success' || showComplete) {
      icon = CHECK_ICON;
      label = 'Uploaded';
    } else if (castStatus === 'error') {
      icon = UPLOAD_ICON;
      label = (
        <>
          <span>Upload failed</span>
          <span
            role="button"
            tabIndex={0}
            className="uk-btn-beam__retry"
            onClick={handleRetry}
            onKeyDown={handleRetryKeyDown}
            aria-label="Retry upload"
          >
            <span dangerouslySetInnerHTML={{ __html: RETRY_ICON }} />
            Retry
          </span>
        </>
      );
    } else {
      icon = UPLOAD_ICON;
      label = children ?? 'Upload';
    }

    const ariaLabel =
      isUploading
        ? `Uploading ${progress}%`
        : castStatus === 'success'
          ? 'Upload complete'
          : castStatus === 'error'
            ? 'Upload failed'
            : 'Upload file';

    const srAnnouncement =
      castStatus === 'uploading'
        ? `${progress}% uploaded`
        : castStatus === 'success'
          ? 'Upload complete'
          : castStatus === 'error'
            ? 'Upload failed'
            : '';

    return (
      <UploadBeam state={beamState}>
        <div className={mergeClass('uk-btn-beam-wrap', className)}>
          <button
            ref={ref}
            type="button"
            className="uk-btn-beam"
            data-uk-element="button"
            data-state={castStatus}
            disabled={disabled || isUploading}
            onClick={handleClick}
            aria-busy={isUploading}
            aria-label={ariaLabel}
          >
            <span
              aria-hidden="true"
              style={{ display: 'inline-flex', flexShrink: 0 }}
              dangerouslySetInnerHTML={{ __html: icon }}
            />
            <span>{label}</span>
          </button>

          {/* Screen-reader live region */}
          <span
            className="uk-btn-beam-sr"
            aria-live="polite"
            aria-atomic="true"
          >
            {srAnnouncement}
          </span>

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
        </div>
      </UploadBeam>
    );
  },
);

UploadButtonBeam.displayName = 'UploadButtonBeam';
