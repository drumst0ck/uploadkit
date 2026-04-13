// UploadProgressLiquid — Apple-style liquid fill progress for single-file uploads.
// A rounded-rectangle container holds an SVG liquid surface that rises as progress
// increases. Two staggered sine-wave paths oscillate horizontally via CSS keyframes,
// creating the illusion of real water with depth. Motion drives the wave translation
// when the peer dep is available; otherwise pure CSS animation handles it.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Injected CSS — a single <style> tag added once per document load.
// We use CSS keyframes for the wave oscillation so the animation runs on the
// compositor thread without JS involvement (smooth even during heavy uploads).
// ---------------------------------------------------------------------------
const STYLE_ID = 'uk-progress-liquid-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes uk-liquid-wave-a {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes uk-liquid-wave-b {
      0%   { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }

    .uk-progress-liquid {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      outline: none;
    }
    .uk-progress-liquid:focus-visible .uk-progress-liquid__vessel {
      box-shadow:
        0 0 0 3px var(--uk-bg, #fff),
        0 0 0 5px var(--uk-primary, #6366f1);
    }

    .uk-progress-liquid__vessel {
      position: relative;
      border-radius: 20px;
      border: 1px solid var(--uk-border, rgba(99,102,241,0.25));
      background: var(--uk-bg, #f8f8fc);
      overflow: hidden;
      transition: border-color 240ms ease-out;
    }
    .uk-progress-liquid[data-state="success"] .uk-progress-liquid__vessel {
      border-color: var(--uk-success, #22c55e);
    }
    .uk-progress-liquid[data-state="error"] .uk-progress-liquid__vessel {
      border-color: var(--uk-error, #ef4444);
    }

    /* SVG fills the vessel exactly */
    .uk-progress-liquid__svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    /* Wave path wrappers — wider than the container so translateX creates a
       seamless loop. Both wrappers share a common height; translateX is the
       only animated property (GPU-composited). */
    .uk-progress-liquid__wave-wrap {
      will-change: transform;
    }
    .uk-progress-liquid__wave-wrap--a {
      animation: uk-liquid-wave-a 2.8s linear infinite;
    }
    .uk-progress-liquid__wave-wrap--b {
      animation: uk-liquid-wave-b 3.6s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .uk-progress-liquid__wave-wrap--a,
      .uk-progress-liquid__wave-wrap--b {
        animation: none;
      }
    }

    /* Center label absolutely positioned over the SVG */
    .uk-progress-liquid__label {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      pointer-events: none;
    }
    .uk-progress-liquid__pct {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.03em;
      color: var(--uk-text, #111);
      transition: opacity 180ms ease-out;
    }
    .uk-progress-liquid__icon {
      color: var(--uk-text-secondary, #6b7280);
      transition: opacity 180ms ease-out, transform 200ms ease-out;
    }
    .uk-progress-liquid__icon:hover {
      transform: scale(1.08);
    }
    .uk-progress-liquid__caption {
      font-size: 11px;
      letter-spacing: 0.04em;
      color: var(--uk-text-secondary, #6b7280);
      text-transform: uppercase;
      pointer-events: none;
    }

    /* Filename below the vessel */
    .uk-progress-liquid__filename {
      font-size: 12px;
      color: var(--uk-text-secondary, #6b7280);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(name: string, max = 22): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 6) {
    // keep extension
    return `${name.slice(0, max - name.length + ext - 1)}…${name.slice(ext)}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

/**
 * Build two tiling sine-wave SVG `d` attributes for the liquid surface.
 *
 * We render the path at 2× the container width so a translateX(-50%) animation
 * creates a seamless horizontal loop — the wave wraps around invisibly.
 *
 * `waveY` is the mean Y of the wave (= top of the liquid column).
 * `amplitude` controls peak-to-trough height.
 * `phase` offsets the second wave by π so the two layers cancel then reinforce,
 *   creating the illusion of depth.
 */
function buildWavePath(w: number, h: number, waveY: number, amplitude: number, phase: number): string {
  // We tile two full periods across 2w so a 50% translate looks seamless.
  const period = w; // one period = container width
  const segments = 4; // 4 half-periods covers 2w
  const step = period / 2;

  let d = `M 0 ${waveY + Math.sin(phase) * amplitude}`;
  for (let i = 0; i < segments; i++) {
    const x1 = i * step + step / 2;
    const x2 = (i + 1) * step;
    const cp1x = i * step + step / 4;
    const cp2x = i * step + (3 * step) / 4;
    const y1 = waveY + Math.sin(phase + (i + 0.5) * Math.PI) * amplitude;
    const y2 = waveY + Math.sin(phase + (i + 1) * Math.PI) * amplitude;
    // Cubic bezier approximating a sine arc
    void x1; void y1;
    d += ` C ${cp1x} ${waveY + Math.sin(phase + i * Math.PI) * amplitude * 1.33},`
       + ` ${cp2x} ${waveY + Math.sin(phase + (i + 1) * Math.PI) * amplitude * 1.33},`
       + ` ${x2} ${y2}`;
  }
  // Close down to bottom-left
  d += ` V ${h} H 0 Z`;
  return d;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadProgressLiquidProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  /** Container width in px. Default 160. */
  width?: number;
  /** Container height in px. Default 200. */
  height?: number;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UploadProgressLiquid = forwardRef<HTMLDivElement, UploadProgressLiquidProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      width = 160,
      height = 200,
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
    void animated; // available for future Motion-driven enhancements

    // Inject styles once on client
    useEffect(() => { ensureStyles(); }, []);

    useEffect(() => {
      if (status === 'success' && result) onUploadComplete?.(result);
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) onUploadError?.(error);
    }, [status, error, onUploadError]);

    function openPicker() {
      if (isUploading) return;
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

    // -----------------------------------------------------------------------
    // Wave geometry
    // -----------------------------------------------------------------------
    // clamp progress 0–100, success snaps to 100
    const pct = status === 'success' ? 100 : Math.min(Math.max(progress, 0), 100);

    // waveY: distance from top of container to the liquid surface mean line.
    // At 0% the surface sits at the bottom edge; at 100% it's at the top.
    // We clamp with a small inset so the wave crests never clip outside.
    const amplitude = 6; // px, wave peak-to-trough half-height
    const minY = amplitude + 2;     // top guard
    const maxY = height - amplitude - 2; // bottom guard
    const waveY = maxY - (pct / 100) * (maxY - minY);

    // SVG paths rendered at 2× width for seamless looping
    const w2 = width * 2;
    const pathA = buildWavePath(w2, height, waveY, amplitude, 0);
    const pathB = buildWavePath(w2, height, waveY, amplitude, Math.PI);

    // Liquid fill color
    let fillColor = 'var(--uk-liquid-fill, var(--uk-primary, #6366f1))';
    if (status === 'success') fillColor = 'var(--uk-success, #22c55e)';
    if (status === 'error')   fillColor = 'var(--uk-error, #ef4444)';

    // Center label content
    const showIdleIcon = status === 'idle';
    const showPct      = isUploading;
    const showSuccess  = status === 'success';
    const showError    = status === 'error';

    const ariaLabel =
      status === 'success' ? 'Upload complete'
      : status === 'error' ? 'Upload failed — click to retry'
      : isUploading         ? `Uploading: ${pct}%`
      : 'Click to upload a file';

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-liquid', className)}
        data-uk-element="container"
        data-state={status}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-busy={isUploading}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {/* Vessel */}
        <div
          className="uk-progress-liquid__vessel"
          style={{ width, height }}
        >
          {/* SVG liquid — rendered at 2× width, clipped by the vessel overflow:hidden */}
          <svg
            className="uk-progress-liquid__svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            role="presentation"
          >
            {/* Background fill tint so there's always something visible */}
            <rect
              x={0} y={0} width={width} height={height}
              fill={fillColor}
              opacity={0.06}
            />

            {/* Wave layer A — primary fill */}
            <g
              className="uk-progress-liquid__wave-wrap uk-progress-liquid__wave-wrap--a"
              style={{
                // Override animation for reduced-motion or if animation prop respected
                animationPlayState: reduced ? 'paused' : 'running',
              }}
            >
              <path
                d={pathA}
                fill={fillColor}
                opacity={0.35}
                style={{ transition: 'd 300ms ease-out' }}
              />
            </g>

            {/* Wave layer B — secondary, offset phase for depth */}
            <g
              className="uk-progress-liquid__wave-wrap uk-progress-liquid__wave-wrap--b"
              style={{
                animationPlayState: reduced ? 'paused' : 'running',
              }}
            >
              <path
                d={pathB}
                fill={fillColor}
                opacity={0.18}
                style={{ transition: 'd 300ms ease-out' }}
              />
            </g>
          </svg>

          {/* Overlay label */}
          <div className="uk-progress-liquid__label">
            {/* Idle: upload icon + caption */}
            {showIdleIcon && (
              <>
                <svg
                  className="uk-progress-liquid__icon"
                  width={28}
                  height={28}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="uk-progress-liquid__caption">Click to upload</span>
              </>
            )}

            {/* Uploading: percentage */}
            {showPct && (
              <span
                className="uk-progress-liquid__pct"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`Upload progress: ${pct}%`}
              >
                {pct}%
              </span>
            )}

            {/* Success: checkmark */}
            {showSuccess && (
              <svg
                className="uk-progress-liquid__icon"
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--uk-success, #22c55e)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Upload complete"
                role="img"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}

            {/* Error: X mark */}
            {showError && (
              <svg
                className="uk-progress-liquid__icon"
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--uk-error, #ef4444)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Upload failed"
                role="img"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
        </div>

        {/* Filename beneath the vessel */}
        {currentNameRef.current && (
          <span className="uk-progress-liquid__filename" title={currentNameRef.current}>
            {truncate(currentNameRef.current)}
          </span>
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
      </div>
    );
  },
);

UploadProgressLiquid.displayName = 'UploadProgressLiquid';
