// UploadStickyBoard — Miro/FigJam-inspired sticky note board where each uploaded
// file becomes a colored post-it note pinned to a corkboard. Notes enter with a
// spring-bounce animation (if motion is available), rotate slightly for a natural
// look, and show a thin progress bar along the bottom edge.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadStickyBoardProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  /** Pastel hex string from the rotating palette */
  color: string;
  /** Rotation in degrees, –6 to +6 */
  rotation: number;
};

// ---------------------------------------------------------------------------
// Sticky-note colour palette (pastel: yellow, red, green, blue, purple, orange)
// ---------------------------------------------------------------------------
const PALETTE = ['#fef08a', '#fca5a5', '#86efac', '#93c5fd', '#c4b5fd', '#fdba74'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deterministic-ish rotation seeded by the last 4 chars of the id. */
function idToRotation(id: string): number {
  const seed = parseInt(id.slice(-4), 36) || 0;
  // Map to –6 .. +6 range
  return ((seed % 1300) / 100) - 6.5;
}

/** Slightly darkened version of a hex pastel for the fold triangle. */
function darken(hex: string, amount = 30): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Truncate a filename to fit the narrow note width. */
function truncateName(name: string, max = 14): string {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, max - ext.length - 1);
  return `${base}…${ext}`;
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

// ---------------------------------------------------------------------------
// Status dot colours
// ---------------------------------------------------------------------------
const DOT_COLOR: Record<FileEntry['status'], string> = {
  idle: '#94a3b8',
  uploading: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UploadStickyBoard = forwardRef<HTMLDivElement, UploadStickyBoardProps>(
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
    },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const paletteIndex = useRef(0);

    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // -----------------------------------------------------------------------
    // Core upload logic (CONCURRENCY = 3)
    // -----------------------------------------------------------------------
    const processFiles = useCallback(
      async (incoming: File[]) => {
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];

        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
            continue;
          }
          const id = makeId();
          const color = PALETTE[paletteIndex.current % PALETTE.length]!;
          paletteIndex.current += 1;
          const rotation = idToRotation(id);
          accepted.push({ id, file: f, status: 'idle', progress: 0, color, rotation });
        }

        if (accepted.length === 0) return;
        setFiles((prev) => [...prev, ...accepted]);

        const CONCURRENCY = 3;
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

    // -----------------------------------------------------------------------
    // Styles
    // -----------------------------------------------------------------------

    /** Corkboard background — warm tan with a tiny repeating dot pattern to
     *  simulate the fibrous texture of a real pinboard, all via inline SVG. */
    const boardBg =
      `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E` +
      `%3Ccircle cx='1' cy='1' r='0.6' fill='rgba(0,0,0,0.06)'/%3E%3C/svg%3E")`;

    const boardStyle: React.CSSProperties = {
      background: isDragging ? '#c89c64' : '#d4a574',
      backgroundImage: boardBg,
      border: isDragging
        ? '2px dashed rgba(0,0,0,0.35)'
        : '1px solid rgba(0,0,0,0.1)',
      borderRadius: 8,
      minHeight: 280,
      padding: 20,
      position: 'relative',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      alignContent: 'flex-start',
      transition: 'background 0.2s ease, border 0.2s ease',
      outline: 'none',
    };

    // -----------------------------------------------------------------------
    // Sticky note renderer
    // -----------------------------------------------------------------------

    const MotionDiv = animated && m ? (m.motion.div as React.ElementType) : null;

    function renderNote(entry: FileEntry) {
      const foldColor = darken(entry.color);
      const isActive = entry.status === 'uploading' || entry.status === 'idle';

      const noteStyle: React.CSSProperties = {
        position: 'relative',
        width: 100,
        height: 100,
        padding: 8,
        paddingTop: 10,
        background: entry.color,
        // Fold in top-right corner: gradient triangle creates the effect without
        // pseudo-elements (which aren't possible in inline styles).
        backgroundImage: [
          boardBg,
          `linear-gradient(225deg, ${foldColor} 0px, ${foldColor} 6px, transparent 6px)`,
        ].join(', '),
        boxShadow: '2px 2px 6px rgba(0,0,0,0.15)',
        borderRadius: 2,
        fontFamily: "'Caveat', cursive, sans-serif",
        fontSize: 11,
        color: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        flexShrink: 0,
      };

      const hoverStyle: React.CSSProperties = {
        ...noteStyle,
        transform: `rotate(${entry.rotation}deg) translateY(-2px)`,
        boxShadow: '4px 6px 14px rgba(0,0,0,0.22)',
      };

      // Status dot in top-left
      const dotStyle: React.CSSProperties = {
        position: 'absolute',
        top: 5,
        left: 5,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: DOT_COLOR[entry.status],
        flexShrink: 0,
      };

      // Progress bar along the bottom edge
      const progressTrackStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'rgba(0,0,0,0.08)',
      };

      const progressFillStyle: React.CSSProperties = {
        height: '100%',
        width: `${entry.progress}%`,
        background: entry.status === 'error' ? '#ef4444' : 'rgba(0,0,0,0.28)',
        transition: 'width 0.25s ease',
      };

      const nameStyle: React.CSSProperties = {
        fontWeight: 700,
        fontSize: 11,
        lineHeight: 1.3,
        wordBreak: 'break-all',
        marginTop: 6,
        // leave room for status dot
        paddingLeft: 10,
      };

      const metaStyle: React.CSSProperties = {
        fontSize: 10,
        color: 'rgba(0,0,0,0.5)',
        paddingLeft: 10,
      };

      const errorStyle: React.CSSProperties = {
        fontSize: 9,
        color: '#b91c1c',
        paddingLeft: 10,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };

      const noteContent = (
        <>
          <span style={dotStyle} aria-hidden="true" />
          <span style={nameStyle}>{truncateName(entry.file.name)}</span>
          <span style={metaStyle}>{formatBytes(entry.file.size)}</span>
          {entry.status === 'error' && entry.error && (
            <span style={errorStyle} title={entry.error}>
              {entry.error}
            </span>
          )}
          {/* Bottom progress bar — visible while uploading */}
          {isActive && (
            <div style={progressTrackStyle} aria-hidden="true">
              <div style={progressFillStyle} />
            </div>
          )}
        </>
      );

      const commonProps = {
        role: 'listitem' as const,
        'aria-label': `${entry.file.name}, ${entry.status}`,
        'data-state': entry.status,
      };

      if (MotionDiv) {
        return (
          <MotionDiv
            key={entry.id}
            style={noteStyle}
            initial={{ opacity: 0, scale: 0.5, rotate: entry.rotation - 10 }}
            animate={{ opacity: 1, scale: 1, rotate: entry.rotation }}
            exit={{ opacity: 0, scale: 0.4, rotate: entry.rotation + 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            whileHover={hoverStyle}
            {...commonProps}
          >
            {noteContent}
          </MotionDiv>
        );
      }

      return (
        <div
          key={entry.id}
          style={{
            ...noteStyle,
            transform: `rotate(${entry.rotation}deg)`,
          }}
          {...commonProps}
        >
          {noteContent}
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Empty state — a faded ghost note with a "+" indicator
    // -----------------------------------------------------------------------

    const emptyNoteStyle: React.CSSProperties = {
      width: 100,
      height: 100,
      padding: 8,
      background: 'rgba(255,255,255,0.35)',
      border: '2px dashed rgba(0,0,0,0.2)',
      borderRadius: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      color: 'rgba(0,0,0,0.4)',
      fontFamily: "'Caveat', cursive, sans-serif",
      fontSize: 11,
      margin: 'auto',
      transform: 'rotate(-1deg)',
      pointerEvents: 'none',
      userSelect: 'none',
    };

    const plusStyle: React.CSSProperties = {
      fontSize: 28,
      lineHeight: 1,
      fontWeight: 300,
      color: 'rgba(0,0,0,0.3)',
    };

    // -----------------------------------------------------------------------
    // "Add note" button — bottom-right, note-shaped
    // -----------------------------------------------------------------------

    const addBtnStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 12,
      right: 12,
      width: 36,
      height: 36,
      background: '#fef08a',
      border: 'none',
      borderRadius: 3,
      boxShadow: '1px 2px 5px rgba(0,0,0,0.18)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      color: '#78716c',
      fontFamily: 'sans-serif',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      zIndex: 10,
      outline: 'none',
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
      <div
        ref={ref}
        className={mergeClass('uk-sticky-board', className)}
        data-uk-element="container"
        data-state={isDragging ? 'dragging' : 'idle'}
        role="region"
        aria-label="Upload sticky board"
        style={boardStyle}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        {...handlers}
      >
        {/* Notes list */}
        {files.length === 0 ? (
          <div style={emptyNoteStyle} aria-hidden="true">
            <span style={plusStyle}>+</span>
            <span>Drop files here</span>
          </div>
        ) : (
          <div
            role="list"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%' }}
          >
            {files.map((entry) => renderNote(entry))}
          </div>
        )}

        {/* "Add note" trigger button */}
        <button
          type="button"
          style={addBtnStyle}
          aria-label="Add files"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) rotate(-2deg)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 4px 10px rgba(0,0,0,0.24)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '1px 2px 5px rgba(0,0,0,0.18)';
          }}
        >
          +
        </button>

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

UploadStickyBoard.displayName = 'UploadStickyBoard';
