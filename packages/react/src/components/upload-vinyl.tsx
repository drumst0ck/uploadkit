// UploadVinyl — Spotify/Bandcamp-inspired vinyl record uploader.
// A circular disc with concentric grooves fills with color as the upload
// progresses. A tonearm swings inward during upload. Motion drives the spin
// animation when the peer dep is available; otherwise pure CSS handles it.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Injected CSS — a single <style> tag added once per document load.
// The spin keyframe runs on the compositor thread for smooth animation even
// during heavy uploads (transform-only animation, no layout reflows).
// ---------------------------------------------------------------------------
const STYLE_ID = 'uk-vinyl-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes uk-vinyl-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    @keyframes uk-vinyl-spin-decel {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .uk-vinyl {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      outline: none;
      flex-shrink: 0;
    }

    .uk-vinyl:focus-visible .uk-vinyl__disc {
      box-shadow:
        0 0 0 3px var(--uk-bg, #fff),
        0 0 0 5px var(--uk-primary, #6366f1);
    }

    .uk-vinyl__disc {
      border-radius: 50%;
      background: var(--uk-vinyl-bg, #1a1a1a);
      position: relative;
      overflow: hidden;
      transition: box-shadow 240ms ease-out;
    }

    /* Static disc (idle / success with no motion) */
    .uk-vinyl__disc[data-spinning="css"] {
      animation: uk-vinyl-spin 2s linear infinite;
    }

    .uk-vinyl__disc[data-spinning="decel"] {
      animation: uk-vinyl-spin-decel 4s linear 1 forwards;
    }

    .uk-vinyl__tonearm {
      position: absolute;
      top: 0;
      right: 0;
      width: 2px;
      height: 60px;
      background: var(--uk-border, rgba(255,255,255,0.18));
      transform-origin: top right;
      border-radius: 1px;
      transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .uk-vinyl__tonearm--idle {
      /* angled away from disc, roughly 30° from vertical */
      transform: rotate(30deg);
    }

    .uk-vinyl__tonearm--playing {
      /* swings inward toward the disc */
      transform: rotate(18deg);
    }

    .uk-vinyl__center-text {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      pointer-events: none;
      color: var(--uk-text-primary, #fafafa);
      font-family: inherit;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UploadVinylProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  /** Diameter of the vinyl disc in px. Default: 200 */
  size?: number;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// SVG icon helpers (inline — no external dep)
// ---------------------------------------------------------------------------
const UploadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const UploadVinyl = forwardRef<HTMLDivElement, UploadVinylProps>(
  (
    {
      route,
      accept = ['audio/*'],
      maxSize,
      metadata,
      size = 200,
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

    // Inject keyframes + base styles once
    useEffect(() => {
      ensureStyles();
    }, []);

    // Callbacks
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

    // ---------------------------------------------------------------------------
    // Groove geometry — 8 concentric rings evenly spaced
    // The SVG viewBox is 200×200 so r values are absolute
    // ---------------------------------------------------------------------------
    const GROOVE_RADII = [90, 80, 70, 60, 50, 40, 30, 20] as const;
    const CENTER = 100; // cx / cy for all elements

    // Progress fill ring — uses stroke-dasharray trick on the outermost groove
    // to convey "grooves filling with color" as upload advances
    const PROGRESS_R = 90;
    const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_R;
    const progressDashOffset = PROGRESS_CIRCUMFERENCE * (1 - progress / 100);

    // Motion-upgraded spin: use m.motion.div wrapping the disc SVG
    const spinStyle: React.CSSProperties = {};
    let cssSpinAttr: string | undefined;

    if (!animated) {
      // CSS fallback
      if (isUploading && !reduced) {
        cssSpinAttr = 'css';
      } else if (status === 'success' && !reduced) {
        cssSpinAttr = 'decel';
      }
    }

    // Tonearm arm angle class
    const tonearmClass = isUploading ? 'uk-vinyl__tonearm uk-vinyl__tonearm--playing' : 'uk-vinyl__tonearm uk-vinyl__tonearm--idle';

    // Center label circle radius (the "label" area on a real vinyl)
    const LABEL_R = 35;
    const HOLE_R = 7;

    // ---------------------------------------------------------------------------
    // Scale SVG & overlay to the actual `size` prop (SVG viewBox is always 200×200)
    // ---------------------------------------------------------------------------
    const discStyle: React.CSSProperties = {
      width: size,
      height: size,
    };

    // ---------------------------------------------------------------------------
    // Motion-animated disc wrapper
    // ---------------------------------------------------------------------------
    const DiscContent = (
      <div
        className="uk-vinyl__disc"
        style={discStyle}
        data-spinning={cssSpinAttr}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base disc fill — handled by .uk-vinyl__disc background */}

          {/* Concentric grooves */}
          {GROOVE_RADII.map((r) => (
            <circle
              key={r}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          ))}

          {/* Progress fill — colored stroke sweeping the outermost groove ring.
              Slightly inset from the edge so it sits on the groove track.
              Opacity gives the "tinted groove" look without covering the disc. */}
          {progress > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={PROGRESS_R}
              fill="none"
              stroke="var(--uk-vinyl-color, var(--uk-primary, #6366f1))"
              strokeWidth={10}
              strokeOpacity={0.28}
              strokeLinecap="round"
              strokeDasharray={PROGRESS_CIRCUMFERENCE}
              strokeDashoffset={progressDashOffset}
              /* Start at top (12 o'clock) */
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          )}

          {/* Secondary fill rings that "color" when progress > thresholds,
              simulating grooves lighting up as the needle passes */}
          {[
            { r: 80, threshold: 12 },
            { r: 70, threshold: 24 },
            { r: 60, threshold: 37 },
            { r: 50, threshold: 50 },
            { r: 40, threshold: 62 },
            { r: 30, threshold: 75 },
            { r: 20, threshold: 87 },
          ].map(({ r, threshold }) =>
            progress >= threshold ? (
              <circle
                key={`fill-${r}`}
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="var(--uk-vinyl-color, var(--uk-primary, #6366f1))"
                strokeWidth={1}
                strokeOpacity={0.18}
              />
            ) : null,
          )}

          {/* Center label area */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={LABEL_R}
            fill="var(--uk-vinyl-color, var(--uk-primary, #6366f1))"
            fillOpacity={status === 'success' ? 0.35 : 0.15}
            style={{ transition: 'fill-opacity 400ms ease-out' }}
          />

          {/* Spindle hole */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={HOLE_R}
            fill="var(--uk-bg, #0a0a0b)"
          />
        </svg>
      </div>
    );

    // Animate spin with Motion when available and not reduced
    const AnimatedDisc =
      animated && m && !reduced ? (
        <m.motion.div
          animate={
            isUploading
              ? { rotate: 360 }
              : status === 'success'
                ? { rotate: 360 }
                : { rotate: 0 }
          }
          transition={
            isUploading
              ? { duration: 2, repeat: Infinity, ease: 'linear' }
              : status === 'success'
                ? { duration: 4, repeat: 0, ease: 'easeOut' }
                : { duration: 0 }
          }
          style={{ borderRadius: '50%', ...spinStyle }}
        >
          {DiscContent}
        </m.motion.div>
      ) : (
        DiscContent
      );

    // ---------------------------------------------------------------------------
    // Center label text overlay (sits on top of the SVG, positioned absolutely)
    // ---------------------------------------------------------------------------
    const labelFontSize = Math.max(10, size * 0.07);
    const labelOffset = size / 2; // center point

    const CenterLabel = (
      <div
        className="uk-vinyl__center-text"
        style={{
          fontSize: labelFontSize,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          opacity: 0.9,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {status === 'idle' && (
          <>
            <UploadIcon />
            <span style={{ fontSize: labelFontSize * 0.85, marginTop: 2, color: 'rgba(255,255,255,0.6)' }}>
              Drop audio
            </span>
          </>
        )}
        {isUploading && (
          <span style={{ fontSize: labelFontSize * 1.2, fontVariantNumeric: 'tabular-nums' }}>
            {progress}%
          </span>
        )}
        {status === 'success' && (
          <>
            <CheckIcon />
            <span style={{ fontSize: labelFontSize * 0.85, marginTop: 2, color: 'rgba(255,255,255,0.6)' }}>
              Done
            </span>
          </>
        )}
        {status === 'error' && (
          <span style={{ fontSize: labelFontSize * 0.8, color: 'var(--uk-error, #f87171)', textAlign: 'center', padding: '0 8px' }}>
            Error
          </span>
        )}
      </div>
    );

    // ---------------------------------------------------------------------------
    // Tonearm — decorative SVG line positioned in top-right corner of container
    // Represents a record player tonearm that swings inward during playback
    // ---------------------------------------------------------------------------
    const tonearmSize = size * 0.35; // scale arm with disc

    return (
      <div
        ref={ref}
        className={mergeClass('uk-vinyl', className)}
        data-uk-element="container"
        data-state={status}
        role="button"
        tabIndex={0}
        aria-label={isUploading ? `Uploading: ${progress}%` : 'Upload audio file'}
        aria-busy={isUploading}
        style={{
          width: size,
          height: size,
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {/* Disc (animated or static) */}
        {AnimatedDisc}

        {/* Center label text positioned over the disc */}
        {CenterLabel}

        {/* Tonearm — positioned at top-right, angled toward the disc center */}
        <div
          className={tonearmClass}
          aria-hidden="true"
          style={{
            height: tonearmSize,
            top: size * 0.04,
            right: size * 0.08,
          }}
        />

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept.join(',')}
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadVinyl.displayName = 'UploadVinyl';
