import { forwardRef, useRef, useEffect, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import type { ProgressGranularity } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { getUploadIcon } from '../utils/file-icons';

export type UploadButtonProps = {
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
  /**
   * Called with the selected files before upload begins.
   * Return modified files array, or empty array to cancel.
   */
  onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>;
  /** Visual style variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disable the button */
  disabled?: boolean;
  /** Additional CSS class(es) for the wrapper */
  className?: string;
  /** Override specific inner element classes */
  appearance?: Partial<Record<'button' | 'progressBar' | 'progressText', string>>;
  /** Custom button label; omit to use the built-in state labels */
  children?: React.ReactNode;
  /**
   * Upload mode.
   * - 'auto' (default): upload starts immediately on file selection.
   * - 'manual': file is staged; user must click again to confirm upload.
   */
  config?: { mode?: 'auto' | 'manual' };
  /** Controls how often onProgress fires. Default: 'coarse' (every 10%). */
  uploadProgressGranularity?: ProgressGranularity;
};

const variantClass: Record<NonNullable<UploadButtonProps['variant']>, string> = {
  default: '',
  outline: 'uk-button--outline',
  ghost: 'uk-button--ghost',
};

// Inline SVGs for the four button states (24x24, currentColor)
const SPINNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="animation:uk-spin 0.7s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

function getStateLabel(
  status: UploadStatus,
  progress: number,
): { icon: string; text: string } {
  switch (status) {
    case 'uploading':
      return { icon: SPINNER_SVG, text: `Uploading ${progress}%` };
    case 'success':
      return { icon: CHECK_SVG, text: 'Uploaded' };
    case 'error':
      return { icon: X_SVG, text: 'Failed' };
    default:
      // 16px version of the cloud-upload icon for idle state
      return {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
        text: 'Upload file',
      };
  }
}

// Map internal status to data-state attribute value
function toDataState(status: UploadStatus): string {
  return status === 'idle' ? 'ready' : status;
}

/**
 * UploadButton — a styled button that opens a file picker and shows upload progress.
 *
 * State lifecycle: idle → uploading (with %) → success → idle (3s delay)
 *                                            → error (stays until reset)
 *
 * Accessibility (REACT-10): aria-busy, aria-label, role=progressbar, hidden input.
 */
export const UploadButton = forwardRef<HTMLButtonElement, UploadButtonProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      onUploadComplete,
      onUploadError,
      onBeforeUploadBegin,
      variant = 'default',
      size = 'md',
      disabled = false,
      className,
      appearance,
      children,
      config,
      uploadProgressGranularity,
    },
    ref,
  ) => {
    const mode = config?.mode ?? 'auto';
    const inputRef = useRef<HTMLInputElement>(null);
    const { status, progress, error, result, isUploading, upload, reset } =
      useUploadKit(route);

    // Manual mode: staged file waiting for second click
    const [stagedFile, setStagedFile] = useState<File | null>(null);

    // Wire onUploadComplete callback
    useEffect(() => {
      if (status === 'success' && result) {
        onUploadComplete?.(result);
        setStagedFile(null);
        // Auto-reset to idle after 3s
        const timer = setTimeout(() => reset(), 3000);
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

    async function triggerUpload(file: File) {
      // Run onBeforeUploadBegin if provided
      if (onBeforeUploadBegin) {
        try {
          const transformed = await onBeforeUploadBegin([file]);
          if (transformed.length === 0) return; // cancelled
          file = transformed[0]!;
        } catch (err) {
          onUploadError?.(err instanceof Error ? err : new Error(String(err)));
          return;
        }
      }

      await upload(
        file,
        metadata,
        uploadProgressGranularity !== undefined ? { progressGranularity: uploadProgressGranularity } : undefined,
      );
    }

    function handleClick() {
      if (disabled || isUploading) return;

      if (mode === 'manual' && stagedFile) {
        // Second click: start upload
        void triggerUpload(stagedFile);
        return;
      }

      inputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side size validation (UX only — server validates authoritatively)
      if (maxSize !== undefined && file.size > maxSize) {
        onUploadError?.(
          new Error(`File exceeds the ${maxSize} byte limit. Choose a smaller file.`),
        );
        e.target.value = '';
        return;
      }

      if (mode === 'manual') {
        // Stage the file, don't upload yet
        setStagedFile(file);
        e.target.value = '';
        return;
      }

      // Auto mode: upload immediately
      await triggerUpload(file);
      // Reset input value so the same file can trigger onChange again
      e.target.value = '';
    }

    const { icon, text } = getStateLabel(status as UploadStatus, progress);
    const buttonVariantClass = variantClass[variant];
    const buttonClass = mergeClass(
      `uk-button uk-button--${size}${buttonVariantClass ? ` ${buttonVariantClass}` : ''}`,
      appearance?.button,
    );

    const ariaLabel = isUploading ? `Uploading ${progress}%` : 'Upload file';

    // Compose a screen-reader announcement string for the current upload state
    const srAnnouncement =
      status === 'uploading'
        ? `${progress}% uploaded`
        : status === 'success'
          ? 'Upload complete'
          : status === 'error'
            ? 'Upload failed'
            : '';

    // Manual mode staged filename display (truncated to 20 chars)
    const stagedName = stagedFile
      ? stagedFile.name.length > 20
        ? `${stagedFile.name.slice(0, 20)}…`
        : stagedFile.name
      : null;

    return (
      <>
        <style>{`@keyframes uk-spin{to{transform:rotate(360deg)}}`}</style>
        <button
          ref={ref}
          type="button"
          className={mergeClass(buttonClass, className)}
          data-uk-element="button"
          data-state={toDataState(status as UploadStatus)}
          disabled={disabled || isUploading}
          onClick={handleClick}
          aria-busy={isUploading}
          aria-label={ariaLabel}
        >
          {children ?? (
            mode === 'manual' && stagedName ? (
              <span className="uk-button__staged">
                <span dangerouslySetInnerHTML={{ __html: icon }} />
                <span>Upload {stagedName}</span>
                <button
                  type="button"
                  className="uk-button__staged-clear"
                  aria-label="Clear selected file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStagedFile(null);
                  }}
                  dangerouslySetInnerHTML={{
                    __html: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
                  }}
                />
              </span>
            ) : (
              <>
                <span dangerouslySetInnerHTML={{ __html: icon }} />
                <span>{text}</span>
              </>
            )
          )}
        </button>

        {/* Screen-reader live region — announces upload progress and status changes */}
        <span
          className="uk-sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {srAnnouncement}
        </span>

        {isUploading && (
          <div
            className="uk-progress-wrap"
            data-uk-element="progress-bar"
            style={{ marginTop: '6px' }}
          >
            <div className={mergeClass('uk-progress', appearance?.progressBar)}>
              <div
                className="uk-progress__bar"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span
              className={mergeClass('uk-progress__text', appearance?.progressText)}
              data-uk-element="progress-text"
            >
              {progress}%
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept?.join(',')}
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </>
    );
  },
);

UploadButton.displayName = 'UploadButton';
