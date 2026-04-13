// UploadDataStream — Matrix/Warp-inspired terminal data stream visualizer.
// Characters rain downward in vertical columns; throughput is tracked in real-time.
// Streams brighten and accelerate proportional to upload progress.

import { forwardRef, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Keyframe injection — injected once per page load via a style tag guard
// ---------------------------------------------------------------------------
const STYLE_ID = 'uk-data-stream-keyframes';

function injectKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes uk-stream-fall {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(100%);  }
    }
    @keyframes uk-stream-blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadDataStreamProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  /** Number of vertical stream columns. Default: 20 */
  columns?: number;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
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

// Pool of hex + ASCII symbols that evoke binary/network data
const STREAM_CHARS = '0123456789ABCDEF|/\\-+=<>{}[]!?#@$%&*^~;:,.';

function generateColumn(length: number, chars: string): string {
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('\n');
}

// ---------------------------------------------------------------------------
// Sub-component: a single vertical stream column
// ---------------------------------------------------------------------------

type StreamColumnProps = {
  index: number;
  total: number;
  chars: string[];
  isActive: boolean;
  progress: number; // 0-100
  reduced: boolean;
};

function StreamColumn({ index, total, chars, isActive, progress, reduced }: StreamColumnProps) {
  // Each column gets a deterministic-ish speed so they feel organic but stable
  // between renders — derive from index so it doesn't re-randomise on every tick.
  const baseDuration = 3 + (index % 7) * 0.8; // 3s – 8.4s base
  const activeDuration = baseDuration * (1 - progress * 0.006); // speed up with progress
  const duration = isActive ? Math.max(activeDuration, 0.8) : baseDuration * 2;
  const delay = -((index * 0.37) % duration); // stagger so columns don't sync-start

  const baseOpacity = isActive ? 0.15 + progress * 0.007 : 0.08;

  const colStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    // Distribute evenly; slight offset so columns don't touch the edges
    left: `calc(${(index / total) * 100}% + 2px)`,
    width: `calc(${100 / total}% - 4px)`,
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const textStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    lineHeight: '14px',
    fontFamily: 'monospace',
    color: 'var(--uk-stream-color, #00ff41)',
    whiteSpace: 'pre',
    // Gradient mask: opaque top, transparent bottom (the classic Matrix fade)
    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
    opacity: baseOpacity,
    ...(reduced
      ? {}
      : {
          animation: `uk-stream-fall ${duration}s ${delay}s linear infinite`,
        }),
  };

  return (
    <div style={colStyle} aria-hidden="true">
      <span style={textStyle}>{chars.join('\n')}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const UploadDataStream = forwardRef<HTMLDivElement, UploadDataStreamProps>(
  (
    {
      route,
      accept,
      maxSize,
      maxFiles,
      metadata,
      onUploadComplete,
      onUploadError,
      className,
      columns = 20,
    },
    ref,
  ) => {
    // ---- runtime setup -------------------------------------------------------
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();

    // ---- keyframe injection --------------------------------------------------
    useEffect(() => {
      injectKeyframes();
    }, []);

    // ---- throughput tracking -------------------------------------------------
    // We track (timestamp, cumulativeBytesTransferred) pairs to compute speed.
    type ThroughputSample = { time: number; bytes: number };
    const throughputRef = useRef<ThroughputSample[]>([]);
    const [throughput, setThroughput] = useState<number>(0); // bytes/s

    // ---- pre-generated stream chars -----------------------------------------
    // useMemo so char sets are stable between renders for each column.
    const columnChars = useMemo<string[][]>(() => {
      const rows = 40; // how many chars tall each column is
      return Array.from({ length: columns }, () =>
        generateColumn(rows, STREAM_CHARS).split('\n'),
      );
    }, [columns]);

    // ---- derived state -------------------------------------------------------
    const uploadingFiles = files.filter((f) => f.status === 'uploading');
    const isUploading = uploadingFiles.length > 0;
    const overallProgress =
      files.length === 0
        ? 0
        : Math.round(
            files.reduce((sum, f) => sum + f.progress, 0) / files.length,
          );

    // The "current" file shown in the overlay — prioritise uploading, then last added
    const activeFile =
      uploadingFiles[0] ??
      files.filter((f) => f.status !== 'idle')[files.filter((f) => f.status !== 'idle').length - 1] ??
      null;

    // ---- upload logic --------------------------------------------------------
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
        throughputRef.current = [];

        const CONCURRENCY = 3;
        const results: UploadResult[] = [];
        let totalBytesTransferred = 0;

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
                  onProgress: (percent) => {
                    setFiles((prev) =>
                      prev.map((f) =>
                        f.id === entry.id ? { ...f, progress: percent } : f,
                      ),
                    );
                    // Track throughput: accumulate bytes based on progress delta
                    const bytesNow = Math.round((percent / 100) * entry.file.size);
                    totalBytesTransferred += bytesNow;
                    const now = Date.now();
                    throughputRef.current.push({ time: now, bytes: totalBytesTransferred });
                    // Keep only last 2 seconds of samples
                    const cutoff = now - 2000;
                    throughputRef.current = throughputRef.current.filter((s) => s.time >= cutoff);
                    // Calculate speed from oldest sample in window
                    const samples = throughputRef.current;
                    if (samples.length >= 2) {
                      const oldest = samples[0]!;
                      const newest = samples[samples.length - 1]!;
                      const dt = (newest.time - oldest.time) / 1000;
                      const db = newest.bytes - oldest.bytes;
                      if (dt > 0) setThroughput(Math.round(db / dt));
                    }
                  },
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
                    f.id === entry.id
                      ? { ...f, status: 'error', error: error.message }
                      : f,
                  ),
                );
                onUploadError?.(error);
                return null;
              }
            }),
          );
          for (const r of out) if (r !== null) results.push(r);
        }

        setThroughput(0);
        if (results.length > 0) onUploadComplete?.(results);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [client, route, accept, maxSize, maxFiles, onUploadComplete, onUploadError],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      inputRef.current?.click();
    }

    // ---- styles --------------------------------------------------------------

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      minHeight: 240,
      borderRadius: 4,
      fontFamily: 'monospace',
      padding: 16,
      cursor: 'pointer',
      background: 'var(--uk-stream-bg, #0a0a0a)',
      // Subtle green glow when uploading
      boxShadow: isUploading
        ? '0 0 40px -10px var(--uk-stream-color, #00ff41), inset 0 0 60px -20px rgba(0,255,65,0.04)'
        : 'none',
      transition: 'box-shadow 0.5s ease',
      // Border: dim when idle, accent when active
      border: isDragging
        ? '1px solid var(--uk-stream-color, #00ff41)'
        : '1px solid rgba(0,255,65,0.12)',
      outline: 'none',
    };

    // Overlay card that sits above the streams
    const overlayStyle: React.CSSProperties = {
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
      gap: 8,
    };

    const overlayCardStyle: React.CSSProperties = {
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      borderRadius: 8,
      padding: '16px 24px',
      border: '1px solid rgba(0,255,65,0.15)',
      textAlign: 'center',
      color: 'var(--uk-stream-color, #00ff41)',
      minWidth: 200,
    };

    const headlineStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.12em',
      margin: 0,
      marginBottom: isDragging ? 0 : 4,
    };

    const subStyle: React.CSSProperties = {
      fontSize: 11,
      opacity: 0.6,
      margin: 0,
      letterSpacing: '0.08em',
    };

    const throughputStyle: React.CSSProperties = {
      fontSize: 12,
      opacity: 0.85,
      margin: '4px 0 0',
      letterSpacing: '0.06em',
    };

    const progressBarWrapStyle: React.CSSProperties = {
      width: '100%',
      height: 2,
      background: 'rgba(0,255,65,0.12)',
      borderRadius: 1,
      marginTop: 10,
      overflow: 'hidden',
    };

    const progressBarFillStyle: React.CSSProperties = {
      height: '100%',
      width: `${overallProgress}%`,
      background: 'var(--uk-stream-color, #00ff41)',
      borderRadius: 1,
      transition: 'width 0.3s ease',
      boxShadow: '0 0 8px 1px var(--uk-stream-color, #00ff41)',
    };

    // File list at the bottom
    const fileListStyle: React.CSSProperties = {
      position: 'relative',
      zIndex: 10,
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    };

    function fileLineColor(status: FileEntry['status']): string {
      if (status === 'success') return '#39d353'; // bright green
      if (status === 'error') return '#ff4444';
      return 'var(--uk-stream-color, #00ff41)';
    }

    function fileLineTag(entry: FileEntry): string {
      if (entry.status === 'success') return '[OK]';
      if (entry.status === 'error') return '[ER]';
      if (entry.status === 'uploading') return '[>>]';
      return '[  ]';
    }

    function fileLineBody(entry: FileEntry): string {
      if (entry.status === 'success')
        return `${entry.file.name} ${formatBytes(entry.file.size)}`;
      if (entry.status === 'error')
        return `${entry.file.name} — ${entry.error ?? 'failed'}`;
      if (entry.status === 'uploading')
        return `${entry.file.name} ${entry.progress}%`;
      return `${entry.file.name} queued`;
    }

    // Upload icon (simple up-arrow in monospace style)
    const UploadIcon = () => (
      <div
        style={{
          fontSize: 20,
          lineHeight: 1,
          opacity: 0.7,
          marginBottom: 6,
          color: 'var(--uk-stream-color, #00ff41)',
          // Animate: gentle float when not uploading
          animation: reduced ? 'none' : 'uk-stream-blink 2.4s ease-in-out infinite',
        }}
        aria-hidden="true"
      >
        ↑
      </div>
    );

    return (
      <div
        ref={ref}
        className={mergeClass('uk-data-stream', className)}
        data-uk-element="container"
        data-state={isDragging ? 'dragging' : isUploading ? 'uploading' : 'idle'}
        role="button"
        tabIndex={0}
        aria-label="Drop files to upload"
        style={containerStyle}
        {...handlers}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Stream columns (background layer)                                   */}
        {/* ------------------------------------------------------------------ */}
        {columnChars.map((chars, i) => (
          <StreamColumn
            key={i}
            index={i}
            total={columns}
            chars={chars}
            isActive={isUploading || isDragging}
            progress={overallProgress}
            reduced={reduced}
          />
        ))}

        {/* ------------------------------------------------------------------ */}
        {/* Center overlay                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="uk-data-stream__overlay" style={overlayStyle}>
          <div className="uk-data-stream__card" style={overlayCardStyle}>
            {!isUploading && !isDragging && files.every((f) => f.status !== 'uploading') && (
              <UploadIcon />
            )}

            {isDragging ? (
              <p style={headlineStyle}>// RELEASE TO UPLOAD</p>
            ) : isUploading && activeFile ? (
              <>
                <p style={headlineStyle}>// TRANSMITTING</p>
                <p style={subStyle}>{activeFile.file.name}</p>
                <p style={{ ...subStyle, opacity: 0.9 }}>{overallProgress}%</p>
                {throughput > 0 && (
                  <p style={throughputStyle}>↑ {formatBytes(throughput)}/s</p>
                )}
                <div style={progressBarWrapStyle}>
                  <div style={progressBarFillStyle} />
                </div>
              </>
            ) : files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error') ? (
              <>
                <p style={headlineStyle}>// TRANSFER COMPLETE</p>
                <p style={subStyle}>
                  {files.filter((f) => f.status === 'success').length} of {files.length} file
                  {files.length !== 1 ? 's' : ''} uploaded
                </p>
              </>
            ) : (
              <>
                <p style={headlineStyle}>// DROP FILES</p>
                <p style={subStyle}>or click to browse</p>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* File list (bottom)                                                  */}
        {/* ------------------------------------------------------------------ */}
        {files.length > 0 && (
          <div
            className="uk-data-stream__file-list"
            style={fileListStyle}
            aria-live="polite"
          >
            {files.map((entry) => (
              <div
                key={entry.id}
                className="uk-data-stream__file-line"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: fileLineColor(entry.status),
                  opacity: entry.status === 'idle' ? 0.5 : 1,
                  display: 'flex',
                  gap: 8,
                  lineHeight: '16px',
                }}
              >
                <span style={{ opacity: 0.7, flexShrink: 0 }}>{fileLineTag(entry)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileLineBody(entry)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Hidden file input                                                   */}
        {/* ------------------------------------------------------------------ */}
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

UploadDataStream.displayName = 'UploadDataStream';
