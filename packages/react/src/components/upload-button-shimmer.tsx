// UploadButtonShimmer — inspired by Vercel & Linear marketing CTAs.
// Shimmer sweep + glow on hover. Static keyframe fallback when motion missing.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';
import { UploadBeam } from './upload-beam';
import type { UploadBeamState } from './upload-beam';

export type UploadButtonShimmerProps = {
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

const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;

export const UploadButtonShimmer = forwardRef<HTMLButtonElement, UploadButtonShimmerProps>(
  (
    { route, accept, maxSize, metadata, onUploadComplete, onUploadError, disabled = false, className, children, beam },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

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

    const label = isUploading ? `Uploading ${progress}%` : (children ?? 'Upload file');

    // Map internal status to UploadBeamState
    const beamState: UploadBeamState =
      status === 'uploading' ? 'uploading'
      : status === 'success' ? 'complete'
      : status === 'error' ? 'error'
      : 'idle';

    const content = (
      <>
        <button
          ref={ref}
          type="button"
          className={mergeClass('uk-btn-shimmer', className)}
          data-uk-element="button"
          data-state={status}
          disabled={disabled || isUploading}
          aria-busy={isUploading}
          aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
          onClick={handleClick}
        >
          {animated ? (
            <m.motion.span
              className="uk-btn-shimmer__sweep"
              aria-hidden="true"
              style={{ animation: 'none' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <span className="uk-btn-shimmer__sweep" aria-hidden="true" />
          )}

          <span className="uk-btn-shimmer__label">
            {animated ? (
              <m.motion.span
                aria-hidden="true"
                style={{ display: 'inline-flex' }}
                animate={isUploading ? { y: 0 } : { y: [0, -2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }}
              />
            ) : (
              <span aria-hidden="true" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }} />
            )}
            <span>{label}</span>
          </span>
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

    if (beam) {
      return <UploadBeam state={beamState}>{content}</UploadBeam>;
    }

    return content;
  },
);

UploadButtonShimmer.displayName = 'UploadButtonShimmer';
