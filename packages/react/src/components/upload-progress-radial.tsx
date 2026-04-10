// UploadProgressRadial — activity-ring style radial progress. Click to pick a
// file, watch the ring fill in as it uploads, splash on success. Motion drives
// `pathLength` when the peer dep is present; otherwise strokeDashoffset.
// Inspired by Linear attachments and Apple Health activity rings.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadProgressRadialProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  size?: number;
  strokeWidth?: number;
  label?: string;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

function truncate(name: string, max = 18): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export const UploadProgressRadial = forwardRef<HTMLDivElement, UploadProgressRadialProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      size = 120,
      strokeWidth = 6,
      label = 'Upload',
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const currentNameRef = useRef<string | null>(null);
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
      currentNameRef.current = file.name;
      await upload(file, metadata);
    }

    // Geometry — SVG viewBox is fixed at 100, everything else scales via `size`.
    const viewBox = 100;
    const radius = (viewBox - strokeWidth) / 2;
    const cx = viewBox / 2;
    const cy = viewBox / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 100) / 100);

    const MotionCircle = animated && m ? m.motion.circle : null;

    const centerText = isUploading && currentNameRef.current
      ? truncate(currentNameRef.current)
      : status === 'success'
        ? 'Done'
        : `${label}`;

    const ariaLabel =
      status === 'success'
        ? 'Upload complete'
        : isUploading
          ? `Upload progress: ${progress}%`
          : label;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-radial', className)}
        data-uk-element="container"
        data-state={status}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-busy={isUploading}
        style={{ width: size, height: size }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <svg
          className="uk-progress-radial__svg"
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          aria-hidden="true"
          role="presentation"
        >
          <circle
            className="uk-progress-radial__track"
            cx={cx}
            cy={cy}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {MotionCircle ? (
            <MotionCircle
              className="uk-progress-radial__fill"
              cx={cx}
              cy={cy}
              r={radius}
              strokeWidth={strokeWidth}
              pathLength={1}
              strokeDasharray="1 1"
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            />
          ) : (
            <circle
              className="uk-progress-radial__fill"
              cx={cx}
              cy={cy}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          )}
        </svg>

        <div
          className="uk-progress-radial__label"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={ariaLabel}
        >
          <span>{isUploading ? `${progress}%` : centerText}</span>
        </div>

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

UploadProgressRadial.displayName = 'UploadProgressRadial';
