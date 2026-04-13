// UploadTimeline — GitHub PR / Linear activity feed-style vertical timeline for
// multi-file uploads. Each file gets a node on the timeline: a status dot on
// the vertical line and file metadata (name, size, progress, timestamp) to its
// right. Nodes animate in sequentially when `motion` is available.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadTimelineProps = {
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
  /** Unix ms timestamp when the entry was created */
  addedAt: number;
};

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(file: File, accept?: string[], maxSize?: number): string | null {
  if (accept && accept.length > 0) {
    const ok = accept.some((p) =>
      p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
    );
    if (!ok) return 'file type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

/** Human-readable relative time label */
function formatTimestamp(status: FileEntry['status'], addedAt: number): string {
  if (status === 'uploading') return 'uploading…';
  if (status === 'idle') return 'queued';
  const delta = Math.round((Date.now() - addedAt) / 1000);
  if (delta < 5) return 'just now';
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.round(delta / 60)}m ago`;
  return `${Math.round(delta / 3600)}h ago`;
}

// ---------------------------------------------------------------------------
// Inline style helpers
// ---------------------------------------------------------------------------

function dotBackground(status: FileEntry['status'] | 'dropzone'): string {
  if (status === 'uploading') return 'var(--uk-primary, #6366f1)';
  if (status === 'success') return 'var(--uk-success, #22c55e)';
  if (status === 'error') return 'var(--uk-error, #ef4444)';
  if (status === 'dropzone') return 'var(--uk-border, rgba(255,255,255,0.08))';
  // idle
  return 'var(--uk-border, rgba(255,255,255,0.08))';
}

function progressFillBackground(status: FileEntry['status']): string {
  if (status === 'success') return 'var(--uk-success, #22c55e)';
  if (status === 'error') return 'var(--uk-error, #ef4444)';
  return 'var(--uk-primary, #6366f1)';
}

// ---------------------------------------------------------------------------
// Sub-components — StatusDot
// ---------------------------------------------------------------------------

type StatusDotProps = {
  status: FileEntry['status'];
  animated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any;
};

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  position: 'relative',
  flexShrink: 0,
  marginLeft: 10,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
};

function StatusDot({ status, animated, m }: StatusDotProps) {
  const style: React.CSSProperties = {
    ...dotStyle,
    background: dotBackground(status),
  };

  const svgCheck = (
    <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 8, height: 8 }}>
      <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const svgX = (
    <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 8, height: 8 }}>
      <path d="M3 3L7 7M7 3L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  if (animated && m) {
    const MotionDiv = m.motion.div;

    // Pulsing animation only while uploading
    const pulseProps =
      status === 'uploading'
        ? {
            animate: { scale: [1, 1.35, 1] },
            transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
          }
        : {};

    return (
      <MotionDiv
        // Keep class name so reduced-motion CSS selectors can target it if needed
        className={`uk-timeline__dot uk-timeline__dot--${status}`}
        style={style}
        aria-hidden="true"
        {...pulseProps}
      >
        {status === 'success' && svgCheck}
        {status === 'error' && svgX}
      </MotionDiv>
    );
  }

  return (
    <div
      className={`uk-timeline__dot uk-timeline__dot--${status}${status === 'uploading' ? ' uk-timeline__dot--pulse' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {status === 'success' && svgCheck}
      {status === 'error' && svgX}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — ProgressBar
// ---------------------------------------------------------------------------

type ProgressBarProps = {
  progress: number;
  status: FileEntry['status'];
  animated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any;
};

function ProgressBar({ progress, status, animated, m }: ProgressBarProps) {
  if (status === 'idle') return null;

  const fillWidth = `${status === 'success' ? 100 : progress}%`;

  const trackStyle: React.CSSProperties = {
    height: 3,
    width: '100%',
    background: 'var(--uk-border, rgba(255,255,255,0.08))',
    borderRadius: 2,
    overflow: 'hidden',
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    background: progressFillBackground(status),
    borderRadius: 2,
  };

  if (animated && m) {
    const MotionDiv = m.motion.div;
    return (
      <div
        className="uk-timeline__progress"
        style={trackStyle}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <MotionDiv
          className={`uk-timeline__progress-fill uk-timeline__progress-fill--${status}`}
          style={fillStyle}
          animate={{ width: fillWidth }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
      </div>
    );
  }

  return (
    <div
      className="uk-timeline__progress"
      style={trackStyle}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`uk-timeline__progress-fill uk-timeline__progress-fill--${status}`}
        style={{ ...fillStyle, width: fillWidth, transition: 'width 280ms ease-out' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — FileNode
// ---------------------------------------------------------------------------

type FileNodeProps = {
  entry: FileEntry;
  index: number;
  animated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any;
};

function FileNode({ entry, index, animated, m }: FileNodeProps) {
  const timestamp = formatTimestamp(entry.status, entry.addedAt);

  const nodeStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '8px 0',
    position: 'relative',
    alignItems: 'flex-start',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 8,
  };

  const fileInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    minWidth: 0,
  };

  const filenameStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--uk-text, rgba(255,255,255,0.9))',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: '1 1 0',
  };

  const filesizeStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--uk-text-secondary, rgba(255,255,255,0.4))',
    flexShrink: 0,
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--uk-text-secondary, rgba(255,255,255,0.4))',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--uk-error, #ef4444)',
  };

  const content = (
    <div className="uk-timeline__node" style={nodeStyle} data-status={entry.status}>
      {/* Status dot sits on the vertical track */}
      <StatusDot status={entry.status} animated={animated} m={m} />

      {/* File metadata to the right */}
      <div className="uk-timeline__content" style={contentStyle}>
        <div className="uk-timeline__file-info" style={fileInfoStyle}>
          <span className="uk-timeline__filename" style={filenameStyle} title={entry.file.name}>
            {entry.file.name}
          </span>
          <span className="uk-timeline__filesize" style={filesizeStyle}>{formatBytes(entry.file.size)}</span>
        </div>

        <ProgressBar
          progress={entry.progress}
          status={entry.status}
          animated={animated}
          m={m}
        />

        <div className="uk-timeline__meta" style={metaStyle}>
          {entry.error ? (
            <span className="uk-timeline__error-msg" style={errorStyle}>{entry.error}</span>
          ) : (
            <span className="uk-timeline__timestamp">{timestamp}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (animated && m) {
    const MotionDiv = m.motion.div;
    return (
      <MotionDiv
        key={entry.id}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, delay: index * 0.06, ease: 'easeOut' }}
      >
        {content}
      </MotionDiv>
    );
  }

  return <div key={entry.id}>{content}</div>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CONCURRENCY = 3;

export const UploadTimeline = forwardRef<HTMLDivElement, UploadTimelineProps>(
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
          } else {
            accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0, addedAt: Date.now() });
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
      [client, route, accept, maxSize, maxFiles, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    const isEmpty = files.length === 0;

    // Styles for the drop zone node
    const dropZoneNodeStyle: React.CSSProperties = {
      display: 'flex',
      gap: 12,
      padding: '8px 0',
      position: 'relative',
      alignItems: 'flex-start',
      cursor: 'pointer',
      outline: 'none',
    };

    const dropZoneDotStyle: React.CSSProperties = {
      ...dotStyle,
      background: isDragging
        ? 'var(--uk-primary, #6366f1)'
        : 'var(--uk-border, rgba(255,255,255,0.08))',
      border: '1px dashed var(--uk-border, rgba(255,255,255,0.16))',
      transition: 'background 200ms ease-out',
    };

    const dropZoneContentStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      paddingLeft: 8,
    };

    const dropZoneLabelStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 500,
      color: isDragging
        ? 'var(--uk-primary, #6366f1)'
        : 'var(--uk-text-secondary, rgba(255,255,255,0.4))',
      transition: 'color 200ms ease-out',
    };

    const dropZoneHintStyle: React.CSSProperties = {
      fontSize: 11,
      color: 'var(--uk-text-secondary, rgba(255,255,255,0.3))',
    };

    // Drop zone node — always rendered at the bottom of the timeline
    const dropZoneNode = (
      <div
        className={mergeClass(
          'uk-timeline__node',
          'uk-timeline__node--dropzone',
          isDragging ? 'uk-timeline__node--dragging' : undefined,
        )}
        style={dropZoneNodeStyle}
        role="button"
        tabIndex={0}
        aria-label="Drop files or click to upload"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {/* Upload icon dot */}
        <div
          className="uk-timeline__dot uk-timeline__dot--dropzone"
          style={dropZoneDotStyle}
          aria-hidden="true"
        >
          <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 8, height: 8, color: 'var(--uk-text-secondary, rgba(255,255,255,0.4))' }}>
            <path d="M5 7V3M5 3L3 5M5 3L7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div
          className="uk-timeline__content uk-timeline__content--dropzone"
          style={dropZoneContentStyle}
        >
          {children ?? (
            <>
              <span className="uk-timeline__dropzone-label" style={dropZoneLabelStyle}>
                {isDragging ? 'Release to upload' : isEmpty ? 'Drop files or click to upload' : 'Add more files'}
              </span>
              {(accept || maxSize) && (
                <span className="uk-timeline__dropzone-hint" style={dropZoneHintStyle}>
                  {[
                    accept ? accept.join(', ') : null,
                    maxSize ? `max ${formatBytes(maxSize)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    );

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
    };

    const trackStyle: React.CSSProperties = {
      position: 'absolute',
      left: 15,
      top: 0,
      bottom: 0,
      width: 2,
      background: 'var(--uk-border, rgba(255,255,255,0.08))',
      borderRadius: 1,
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-timeline', className)}
        style={containerStyle}
        data-uk-element="container"
        data-state={
          isDragging
            ? 'dragging'
            : files.some((f) => f.status === 'uploading')
              ? 'uploading'
              : !isEmpty && files.every((f) => f.status === 'success')
                ? 'success'
                : 'idle'
        }
        aria-label="File upload timeline"
        {...handlers}
      >
        {/* Vertical track — absolutely positioned, spans full container height */}
        <div className="uk-timeline__track" style={trackStyle} aria-hidden="true" />

        {/* File entries */}
        {files.map((entry, index) => (
          <FileNode
            key={entry.id}
            entry={entry}
            index={index}
            animated={animated}
            m={m}
          />
        ))}

        {/* Drop zone node always at the bottom */}
        {dropZoneNode}

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

UploadTimeline.displayName = 'UploadTimeline';
