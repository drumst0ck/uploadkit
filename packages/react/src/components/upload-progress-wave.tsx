// UploadProgressWave — Spotify/SoundCloud-inspired audio waveform progress
// visualizer for single-file uploads. A row of vertical bars fills left-to-
// right as upload progress increases; each bar has a unique height derived
// from a deterministic sine curve so it looks like a real audio waveform.

import { forwardRef, useEffect, useRef, useMemo } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadProgressWaveProps = {
  /** Upload route registered in your UploadKit router. */
  route: string;
  /** MIME types / extensions the file picker should accept. */
  accept?: string[];
  /** Maximum file size in bytes. Triggers onUploadError if exceeded. */
  maxSize?: number;
  /** Arbitrary metadata forwarded to the server upload handler. */
  metadata?: Record<string, unknown>;
  /**
   * Number of waveform bars to render. More bars give a denser waveform.
   * @default 24
   */
  bars?: number;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

// Deterministic height factor in [0.3, 1.0] for bar at `index` — based on a
// sine curve so the shape stays stable across renders without needing state.
function barHeightFactor(index: number): number {
  return 0.3 + (Math.sin(index * 1.8 + 0.5) + 1) * 0.35;
}

// Container height in px — each bar's max height uses this as a ceiling.
const CONTAINER_HEIGHT = 80;
const BAR_WIDTH = 4;
const BAR_GAP = 3;

export const UploadProgressWave = forwardRef<HTMLDivElement, UploadProgressWaveProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      bars: barCount = 24,
      onUploadComplete,
      onUploadError,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Pre-compute height factors once — deterministic so they never re-randomise.
    const heightFactors = useMemo(
      () => Array.from({ length: barCount }, (_, i) => barHeightFactor(i)),
      [barCount],
    );

    // Number of bars that should be in the "filled" state given current progress.
    const filledCount = Math.round((progress / 100) * barCount);

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
        onUploadError?.(new Error(`File exceeds the ${maxSize}-byte limit.`));
        return;
      }
      await upload(file, metadata);
    }

    // Accessible label varies by lifecycle state.
    const ariaLabel =
      status === 'uploading'
        ? `Uploading — ${progress}%`
        : status === 'success'
          ? 'Upload complete'
          : status === 'error'
            ? 'Upload failed — click to retry'
            : 'Click to select a file to upload';

    // Filename shown below the bars when a file is in flight or done.
    const filename = result?.name ?? null;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-wave', className)}
        data-uk-element="container"
        data-state={status}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: isUploading ? 'default' : 'pointer',
          userSelect: 'none',
          // Let consumers override via className / custom props.
        }}
      >
        {/* Waveform bars */}
        <div
          className="uk-progress-wave__bars"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Upload progress"
          aria-hidden="false"
          style={{
            display: 'inline-flex',
            alignItems: 'flex-end',
            gap: `${BAR_GAP}px`,
            height: `${CONTAINER_HEIGHT}px`,
          }}
        >
          {heightFactors.map((factor, i) => {
            const barHeight = Math.round(CONTAINER_HEIGHT * factor);
            const isFilled = i < filledCount;
            const isSuccess = status === 'success';

            if (animated && m) {
              // Motion-enhanced bars — filled bars animate scaleY; uploading
              // unfilled bars gently pulse via a repeating animation.
              const MotionDiv = m.motion.div as React.ComponentType<React.HTMLAttributes<HTMLDivElement> & {
                animate?: Record<string, unknown>;
                initial?: Record<string, unknown>;
                transition?: Record<string, unknown>;
                style?: React.CSSProperties;
              }>;

              // Success: every bar has staggered pulse to celebrate.
              const successAnimation = isSuccess
                ? {
                    scaleY: [1, 1.15, 0.9, 1.05, 1],
                    transition: {
                      duration: 0.5,
                      delay: i * 0.025,
                      ease: 'easeInOut',
                    },
                  }
                : {};

              // While uploading, unfilled bars pulse gently like a listening indicator.
              const pulseAnimation =
                isUploading && !isFilled
                  ? {
                      scaleY: [0.8, 1, 0.8],
                      transition: {
                        duration: 1.2,
                        delay: i * 0.06,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }
                  : {};

              // Idle state: slow ambient pulse across all bars.
              const idleAnimation =
                status === 'idle'
                  ? {
                      scaleY: [0.6, 1, 0.6],
                      transition: {
                        duration: 2.5,
                        delay: i * 0.07,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }
                  : {};

              const activeAnimation = isSuccess ? successAnimation : (isUploading ? (isFilled ? {} : pulseAnimation) : idleAnimation);

              return (
                <MotionDiv
                  key={i}
                  className="uk-progress-wave__bar"
                  data-filled={isFilled ? 'true' : 'false'}
                  data-index={i}
                  initial={{ scaleY: 0.6 }}
                  animate={{ scaleY: 1, ...activeAnimation }}
                  style={{
                    width: `${BAR_WIDTH}px`,
                    height: `${barHeight}px`,
                    borderRadius: '2px',
                    transformOrigin: 'bottom',
                    // Smooth fill color transition as bars cross the progress threshold.
                    backgroundColor: isFilled || isSuccess
                      ? 'var(--uk-wave-fill, var(--uk-primary, #6366f1))'
                      : 'var(--uk-wave-track, rgba(255,255,255,0.08))',
                    transition: 'background-color 120ms ease-out',
                    flexShrink: 0,
                  }}
                />
              );
            }

            // Static fallback — no motion dependency.
            return (
              <div
                key={i}
                className="uk-progress-wave__bar"
                data-filled={isFilled ? 'true' : 'false'}
                data-index={i}
                style={{
                  width: `${BAR_WIDTH}px`,
                  height: `${barHeight}px`,
                  borderRadius: '2px',
                  transformOrigin: 'bottom',
                  backgroundColor: isFilled || status === 'success'
                    ? 'var(--uk-wave-fill, var(--uk-primary, #6366f1))'
                    : 'var(--uk-wave-track, rgba(255,255,255,0.08))',
                  transition: 'background-color 120ms ease-out',
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* Filename label beneath the waveform */}
        {filename ? (
          <span
            className="uk-progress-wave__filename"
            style={{
              fontSize: '11px',
              lineHeight: 1.4,
              color: 'var(--uk-text-secondary, rgba(255,255,255,0.45))',
              maxWidth: `${barCount * (BAR_WIDTH + BAR_GAP) - BAR_GAP}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filename}
          </span>
        ) : null}

        {/* Visually hidden status for screen readers */}
        <span
          className="uk-progress-wave__sr-status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          {status === 'uploading'
            ? `Uploading ${progress}%`
            : status === 'success'
              ? 'Upload complete'
              : status === 'error'
                ? 'Upload failed'
                : ''}
        </span>

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

UploadProgressWave.displayName = 'UploadProgressWave';
