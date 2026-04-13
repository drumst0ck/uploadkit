// UploadEnvelope — WeTransfer-inspired envelope component built with SVG.
// The envelope is drawn as a single SVG with a body, flap, and fold line.
// On drag/upload the flap animates open. A wax seal appears on completion.
// All styling via inline styles — zero Tailwind dependency (SDK constraint).

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadEnvelopeProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: Error;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(file: File, accept?: string[], maxSize?: number): string | null {
  if (accept && accept.length > 0) {
    const ok = accept.some((p) =>
      p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
    );
    if (!ok) return 'type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

function StatusDot({ status }: { status: FileEntry['status'] }) {
  const color =
    status === 'success'
      ? 'var(--uk-success, #22c55e)'
      : status === 'error'
        ? 'var(--uk-error, #ef4444)'
        : status === 'uploading'
          ? 'var(--uk-primary, #6366f1)'
          : 'var(--uk-text-secondary, #71717a)';
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// SVG Envelope visual — simple flat illustration, no 3D transforms
// ---------------------------------------------------------------------------

// Dimensions: 280 x 180 viewBox
const W = 280;
const H = 180;
const FOLD_Y = 70; // where the flap meets the body

// Body: rectangle from fold line to bottom with rounded bottom corners
const BODY_PATH = `M0,${FOLD_Y} L0,${H - 8} Q0,${H} 8,${H} L${W - 8},${H} Q${W},${H} ${W},${H - 8} L${W},${FOLD_Y} Z`;

// Flap CLOSED: triangle from fold corners pointing DOWN into the body
const FLAP_CLOSED = `M0,${FOLD_Y} L${W / 2},${FOLD_Y + 55} L${W},${FOLD_Y} Z`;

// Flap OPEN: triangle from fold corners pointing UP above the envelope
const FLAP_OPEN = `M0,${FOLD_Y} L${W / 2},${FOLD_Y - 58} L${W},${FOLD_Y} Z`;

// Inner fold lines (V shape visible inside body when flap is open)
const INNER_V = `M0,${FOLD_Y} L${W / 2},${FOLD_Y + 50} L${W},${FOLD_Y}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CONCURRENCY = 3;

export const UploadEnvelope = forwardRef<HTMLDivElement, UploadEnvelopeProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, className, children },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Upload logic — same as all multi-file components
    const processFiles = useCallback(
      async (incoming: File[]) => {
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];
        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
          } else {
            accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0 });
          }
        }
        if (accepted.length === 0) return;
        setFiles((prev) => [...prev, ...accepted]);

        const results: UploadResult[] = [];
        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const out = await Promise.all(
            batch.map(async (entry) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' } : f)),
              );
              try {
                const r = await client.upload({
                  file: entry.file,
                  route,
                  ...(metadata !== undefined ? { metadata } : {}),
                  onProgress: (percent) =>
                    setFiles((prev) =>
                      prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
                    ),
                });
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === entry.id ? { ...f, status: 'success', progress: 100 } : f,
                  ),
                );
                return r;
              } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setFiles((prev) =>
                  prev.map((f) => (f.id === entry.id ? { ...f, status: 'error', error } : f)),
                );
                onUploadError?.(error);
                return null;
              }
            }),
          );
          for (const r of out) if (r !== null) results.push(r);
        }
        if (results.length > 0) onUploadComplete?.(results);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [client, route, accept, maxSize, maxFiles, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    // Derived state
    const totalFiles = files.length;
    const allSuccess = totalFiles > 0 && files.every((f) => f.status === 'success');
    const isUploading = files.some((f) => f.status === 'uploading');
    const overallProgress =
      totalFiles > 0 ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / totalFiles) : 0;

    // Flap opens when dragging or uploading
    const flapOpen = isDragging || isUploading || (totalFiles > 0 && files.some((f) => f.status !== 'idle'));

    // Caption text
    let caption: string;
    if (allSuccess) {
      caption = totalFiles === 1 ? '1 file sent' : `${totalFiles} files sent`;
    } else if (isUploading) {
      caption = `Sending${totalFiles > 1 ? ` ${totalFiles} files` : ''}… ${overallProgress}%`;
    } else if (isDragging) {
      caption = 'Release to send';
    } else if (totalFiles > 0) {
      caption = `${totalFiles} file${totalFiles !== 1 ? 's' : ''} queued`;
    } else {
      caption = children ? String(children) : 'Drop files to send';
    }

    // Progress fill height inside body (from bottom of body to fold line)
    const bodyHeight = H - FOLD_Y;
    const fillHeight = (overallProgress / 100) * bodyHeight;

    // Colors
    const bodyFill = 'var(--uk-bg-secondary, #18181b)';
    const flapFill = '#1e1e24';
    const borderColor = isDragging
      ? 'var(--uk-primary, #6366f1)'
      : 'rgba(255,255,255,0.1)';
    const accentColor = 'var(--uk-primary, #6366f1)';

    return (
      <div
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        className={mergeClass('uk-envelope', className)}
        data-uk-element="envelope"
      >
        {/* SVG Envelope */}
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          aria-label={caption}
          style={{ cursor: 'pointer', outline: 'none', width: W, height: H, position: 'relative' }}
          {...handlers}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ display: 'block' }}
          >
            {/* Body */}
            <path d={BODY_PATH} fill={bodyFill} stroke={borderColor} strokeWidth={1.2} />

            {/* Progress fill inside body — clip to body shape */}
            <defs>
              <clipPath id="uk-env-body-clip">
                <path d={BODY_PATH} />
              </clipPath>
            </defs>
            <rect
              x={0}
              y={H - fillHeight}
              width={W}
              height={fillHeight}
              fill={accentColor}
              opacity={0.15}
              clipPath="url(#uk-env-body-clip)"
              style={{ transition: 'y 0.3s ease, height 0.3s ease' }}
            />

            {/* Inner V fold lines */}
            <path
              d={INNER_V}
              stroke={borderColor}
              strokeWidth={0.8}
              opacity={0.5}
            />

            {/* Center content — upload icon or progress text */}
            {!isUploading && !allSuccess && totalFiles === 0 && (
              <g transform={`translate(${W / 2}, ${FOLD_Y + 48})`} opacity={0.4}>
                <path
                  d="M-8,4 L0,-4 L8,4 M0,-4 L0,10"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{ color: 'var(--uk-text, #fafafa)' }}
                />
              </g>
            )}
            {isUploading && (
              <text
                x={W / 2}
                y={FOLD_Y + 52}
                textAnchor="middle"
                fill="var(--uk-text, #fafafa)"
                fontSize={16}
                fontWeight={600}
                fontFamily="var(--uk-font, system-ui)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {overallProgress}%
              </text>
            )}

            {/* Flap — switches between closed (pointing down) and open (pointing up) */}
            <path
              d={flapOpen ? FLAP_OPEN : FLAP_CLOSED}
              fill={flapFill}
              stroke={borderColor}
              strokeWidth={1.2}
              style={{ transition: 'd 0.4s ease' }}
            />

            {/* Fold line (horizontal, on top of everything) */}
            <line
              x1={0}
              y1={FOLD_Y}
              x2={W}
              y2={FOLD_Y}
              stroke={borderColor}
              strokeWidth={1}
            />
          </svg>

          {/* Wax seal — HTML element positioned on top of the SVG */}
          {allSuccess && (
            <div
              style={{
                position: 'absolute',
                top: FOLD_Y - 18,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--uk-success, #22c55e)',
                boxShadow: '0 0 0 3px var(--uk-bg, #0a0a0b), 0 0 0 5px var(--uk-success, #22c55e), 0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
              }}
              aria-label="All files sent"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M4 9.5L7.5 13L14 5.5"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Caption */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--uk-text-secondary, #71717a)',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
          aria-live="polite"
        >
          {caption}
        </p>

        {/* File list */}
        {files.length > 0 && (
          <ul
            style={{
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              width: W,
            }}
            aria-label="Queued files"
            role="list"
          >
            {files.map((f) => (
              <li
                key={f.id}
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: 'var(--uk-text, #fafafa)',
                  padding: '3px 0',
                }}
              >
                <StatusDot status={f.status} />
                <span
                  style={{
                    flex: '0 1 auto',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                  title={f.file.name}
                >
                  {f.file.name}
                </span>
                <span
                  style={{
                    color: f.error ? 'var(--uk-error, #ef4444)' : 'var(--uk-text-secondary, #71717a)',
                    flexShrink: 0,
                    marginLeft: 'auto',
                    fontSize: 10,
                  }}
                >
                  {f.error ? 'failed' : formatBytes(f.file.size)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          hidden
          accept={accept?.join(',')}
          onChange={(e) => {
            const sel = Array.from(e.target.files ?? []);
            if (sel.length > 0) void processFiles(sel);
            e.target.value = '';
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadEnvelope.displayName = 'UploadEnvelope';
