// UploadBlueprint — technical blueprint/schematic-styled dropzone. Dark blue
// background with white grid lines, crosshair markers, dimension annotations,
// and file readout lines styled like engineering printouts.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadBlueprintProps = {
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
  error?: string;
};

const CONCURRENCY = 3;

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

/** Render a progress bar using block characters. 10 slots total. */
function blockBar(progress: number): string {
  const filled = Math.round((progress / 100) * 10);
  const empty = 10 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/** Pad a string with dots to a fixed visual width. */
function dotPad(name: string, targetLen = 24): string {
  if (name.length >= targetLen) return name.slice(0, targetLen - 3) + '...';
  return name + ' ' + '.'.repeat(targetLen - name.length - 1);
}

// ---------------------------------------------------------------------------
// Corner marker
// ---------------------------------------------------------------------------

type CornerProps = {
  position: 'tl' | 'tr' | 'bl' | 'br';
  /** How far inward from the corner in px */
  offset: number;
  accent: string;
  animated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any;
};

function CornerMarker({ position, offset, accent, animated, m }: CornerProps) {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';
  const size = 12;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    // Two-sided L-bracket border
    borderTop: isTop ? `1px solid ${accent}` : undefined,
    borderBottom: !isTop ? `1px solid ${accent}` : undefined,
    borderLeft: isLeft ? `1px solid ${accent}` : undefined,
    borderRight: !isLeft ? `1px solid ${accent}` : undefined,
    top: isTop ? offset : undefined,
    bottom: !isTop ? offset : undefined,
    left: isLeft ? offset : undefined,
    right: !isLeft ? offset : undefined,
    transition: animated ? undefined : 'top 160ms ease-out, bottom 160ms ease-out, left 160ms ease-out, right 160ms ease-out',
  };

  if (animated && m) {
    const MotionDiv = m.motion.div;
    return (
      <MotionDiv
        className="uk-blueprint__corner"
        data-position={position}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderTop: isTop ? `1px solid ${accent}` : undefined,
          borderBottom: !isTop ? `1px solid ${accent}` : undefined,
          borderLeft: isLeft ? `1px solid ${accent}` : undefined,
          borderRight: !isLeft ? `1px solid ${accent}` : undefined,
        }}
        animate={{
          top: isTop ? offset : undefined,
          bottom: !isTop ? offset : undefined,
          left: isLeft ? offset : undefined,
          right: !isLeft ? offset : undefined,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      />
    );
  }

  return (
    <div className="uk-blueprint__corner" data-position={position} style={baseStyle} aria-hidden="true" />
  );
}

// ---------------------------------------------------------------------------
// File readout line
// ---------------------------------------------------------------------------

function FileReadout({ entry }: { entry: FileEntry }) {
  const accent = 'var(--uk-blueprint-accent, #4cc9f0)';
  const errorColor = '#ff6b6b';
  const successColor = '#69ff47';

  let color = accent;
  let content: React.ReactNode;

  if (entry.status === 'success') {
    color = successColor;
    content = (
      <>
        <span style={{ opacity: 0.6 }}>&gt; </span>
        {dotPad(entry.file.name)} {formatBytes(entry.file.size)}{' '}
        <span style={{ color: successColor }}>[OK]</span>
      </>
    );
  } else if (entry.status === 'error') {
    color = errorColor;
    content = (
      <>
        <span style={{ opacity: 0.6 }}>&gt; </span>
        {dotPad(entry.file.name)} {formatBytes(entry.file.size)}{' '}
        <span style={{ color: errorColor }}>[ERR] {entry.error ?? 'failed'}</span>
      </>
    );
  } else if (entry.status === 'uploading') {
    content = (
      <>
        <span style={{ opacity: 0.6 }}>&gt; </span>
        {dotPad(entry.file.name)} {formatBytes(entry.file.size)}{' '}
        {blockBar(entry.progress)} {entry.progress}%
      </>
    );
  } else {
    content = (
      <>
        <span style={{ opacity: 0.6 }}>&gt; </span>
        {dotPad(entry.file.name)} {formatBytes(entry.file.size)}{' '}
        <span style={{ opacity: 0.5 }}>[QUEUED]</span>
      </>
    );
  }

  return (
    <div
      className="uk-blueprint__readout-line"
      data-status={entry.status}
      style={{
        fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, Consolas, monospace',
        fontSize: 11,
        lineHeight: 1.7,
        color,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const UploadBlueprint = forwardRef<HTMLDivElement, UploadBlueprintProps>(
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

    const processFiles = useCallback(
      async (incoming: File[]) => {
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];

        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
            setFiles((prev) => [
              ...prev,
              { id: makeId(), file: f, status: 'error', progress: 0, error: reason },
            ]);
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
                  prev.map((f) =>
                    f.id === entry.id ? { ...f, status: 'error', error: error.message } : f,
                  ),
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
      [client, route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    // Corner marker offset — expands outward 4px on drag
    const cornerOffset = isDragging ? 6 : 10;
    const accent = 'var(--uk-blueprint-accent, #4cc9f0)';

    // ---------------------------------------------------------------------------
    // Crosshair style — brighten on drag
    // ---------------------------------------------------------------------------
    const crosshairOpacity = isDragging ? 0.55 : 0.3;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-blueprint', className)}
        data-uk-element="container"
        data-state={isDragging ? 'dragging' : files.some((f) => f.status === 'uploading') ? 'uploading' : 'idle'}
        role="button"
        tabIndex={0}
        aria-label="Drop files to upload"
        {...handlers}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        style={{
          // CSS custom property hooks for consumers
          background: 'var(--uk-blueprint-bg, #0d1b2a)',
          position: 'relative',
          overflow: 'hidden',
          padding: 32,
          borderRadius: 4,
          minHeight: 240,
          cursor: 'pointer',
          outline: 'none',
          userSelect: 'none',
          // Blueprint grid — two sets of repeating gradients for X/Y lines
          backgroundImage: [
            'repeating-linear-gradient(0deg, var(--uk-blueprint-grid, rgba(255,255,255,0.06)) 0 1px, transparent 1px 20px)',
            'repeating-linear-gradient(90deg, var(--uk-blueprint-grid, rgba(255,255,255,0.06)) 0 1px, transparent 1px 20px)',
          ].join(', '),
        }}
      >
        {/* ----------------------------------------------------------------
            Crosshair — horizontal line spanning full width at vertical center
        ---------------------------------------------------------------- */}
        <div
          className="uk-blueprint__crosshair-h"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: 1,
            background: accent,
            opacity: crosshairOpacity,
            transform: 'translateY(-0.5px)',
            transition: 'opacity 200ms ease-out',
            pointerEvents: 'none',
          }}
        />
        {/* Crosshair — vertical line spanning full height at horizontal center */}
        <div
          className="uk-blueprint__crosshair-v"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            height: '100%',
            width: 1,
            background: accent,
            opacity: crosshairOpacity,
            transform: 'translateX(-0.5px)',
            transition: 'opacity 200ms ease-out',
            pointerEvents: 'none',
          }}
        />

        {/* ----------------------------------------------------------------
            Corner L-bracket markers — animate outward on drag
        ---------------------------------------------------------------- */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
          <CornerMarker
            key={pos}
            position={pos}
            offset={cornerOffset}
            accent={accent}
            animated={animated}
            m={m}
          />
        ))}

        {/* ----------------------------------------------------------------
            Center content area — upload icon + label + dimension annotation
        ---------------------------------------------------------------- */}
        <div
          className="uk-blueprint__center"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: files.length > 0 ? undefined : 'calc(240px - 64px)',
            paddingBottom: files.length > 0 ? 16 : 0,
          }}
        >
          {/* Schematic upload icon — SVG with circuit-board aesthetic */}
          <svg
            className="uk-blueprint__icon"
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ color: accent, opacity: isDragging ? 1 : 0.75, transition: 'opacity 200ms ease-out' }}
          >
            {/* Outer technical frame */}
            <rect x="1" y="1" width="34" height="34" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
            {/* Upload arrow — two horizontal ticks + vertical shaft */}
            <line x1="18" y1="24" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <polyline points="12,16 18,10 24,16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            {/* Base line */}
            <line x1="11" y1="27" x2="25" y2="27" stroke="currentColor" strokeWidth="1.5" />
            {/* Small dimension tick marks */}
            <line x1="11" y1="24" x2="11" y2="30" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
            <line x1="25" y1="24" x2="25" y2="30" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
          </svg>

          {/* Title — monospace, uppercase, engineering label style */}
          <span
            className="uk-blueprint__title"
            style={{
              fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, Consolas, monospace',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: accent,
              opacity: isDragging ? 1 : 0.85,
              transition: 'opacity 200ms ease-out',
            }}
          >
            {children ?? 'DROP FILES TO UPLOAD'}
          </span>

          {/* Dimension annotation — only rendered when maxSize is provided */}
          {maxSize !== undefined && (
            <span
              className="uk-blueprint__annotation"
              aria-label={`Maximum file size: ${formatBytes(maxSize)}`}
              style={{
                fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, Consolas, monospace',
                fontSize: 10,
                color: accent,
                opacity: 0.45,
                letterSpacing: '0.08em',
              }}
            >
              [MAX: {formatBytes(maxSize)}]
            </span>
          )}
        </div>

        {/* ----------------------------------------------------------------
            File readout panel — technical log lines for each queued file
        ---------------------------------------------------------------- */}
        {files.length > 0 && (
          <div
            className="uk-blueprint__readout"
            aria-live="polite"
            aria-label="File upload status"
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${accent}`,
              opacity: 0.9,
            }}
          >
            {animated ? (
              <m.AnimatePresence initial={false}>
                {files.map((entry) => (
                  <m.motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <FileReadout entry={entry} />
                  </m.motion.div>
                ))}
              </m.AnimatePresence>
            ) : (
              files.map((entry) => <FileReadout key={entry.id} entry={entry} />)
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------
            Technical stamp — bottom-right corner watermark
        ---------------------------------------------------------------- */}
        <div
          className="uk-blueprint__stamp"
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 14,
            fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, Consolas, monospace',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: accent,
            opacity: 0.3,
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          UPLOADKIT v0.x
        </div>

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

UploadBlueprint.displayName = 'UploadBlueprint';
