// UploadProgressBar — horizontal CTA + progress bar with shimmer sweep and
// an indeterminate sliding state. Inspired by Vercel build logs and Linear CI
// progress bars.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useReducedMotionSafe } from '../utils/motion-optional';

export type UploadProgressBarProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  indeterminate?: boolean;
  showPercent?: boolean;
  buttonLabel?: string;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

const CHECK_SVG = (
  <svg
    className="uk-progress-bar__check"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
  </svg>
);

export const UploadProgressBar = forwardRef<HTMLDivElement, UploadProgressBarProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      indeterminate = false,
      showPercent = true,
      buttonLabel = 'Select file',
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const reduced = useReducedMotionSafe();

    useEffect(() => {
      if (status === 'success' && result) onUploadComplete?.(result);
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) onUploadError?.(error);
    }, [status, error, onUploadError]);

    function openPicker() {
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

    const resolvedState: 'idle' | 'indeterminate' | 'uploading' | 'success' | 'error' =
      status === 'success'
        ? 'success'
        : status === 'error'
          ? 'error'
          : indeterminate || (isUploading && progress === 0)
            ? 'indeterminate'
            : isUploading
              ? 'uploading'
              : 'idle';

    const fillWidth =
      resolvedState === 'success'
        ? '100%'
        : resolvedState === 'indeterminate'
          ? undefined
          : `${progress}%`;

    const showShimmer = !reduced && resolvedState === 'uploading' && progress > 0;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-bar', className)}
        data-uk-element="container"
        data-state={resolvedState}
      >
        <button
          type="button"
          className="uk-progress-bar__button"
          onClick={openPicker}
          disabled={isUploading}
          aria-label={buttonLabel}
        >
          {isUploading ? 'Uploading…' : buttonLabel}
        </button>

        <div
          className="uk-progress-bar__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          {...(resolvedState === 'indeterminate' ? {} : { 'aria-valuenow': progress })}
          aria-label="Upload progress"
        >
          <div
            className="uk-progress-bar__fill"
            style={fillWidth !== undefined ? { width: fillWidth } : undefined}
          >
            {showShimmer ? <span className="uk-progress-bar__shimmer" /> : null}
          </div>
          {resolvedState === 'success' ? CHECK_SVG : null}
        </div>

        {showPercent ? (
          <div className="uk-progress-bar__label">
            <span>
              {resolvedState === 'success'
                ? 'Complete'
                : resolvedState === 'error'
                  ? 'Failed'
                  : resolvedState === 'indeterminate'
                    ? 'Preparing…'
                    : `${progress}%`}
            </span>
            <span>{status === 'success' ? '100%' : ''}</span>
          </div>
        ) : null}

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

UploadProgressBar.displayName = 'UploadProgressBar';
