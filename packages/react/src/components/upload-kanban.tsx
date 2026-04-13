// UploadKanban — Trello/Linear CI-inspired multi-file uploader where files move
// through visible pipeline columns: Queued → Uploading → Complete (and Error).
// Motion's layoutId enables smooth cross-column card transitions when available.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadKanbanProps = {
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 5.5L4.5 8L9 3"
        stroke="var(--uk-success, #22c55e)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2.5 2.5L8.5 8.5M8.5 2.5L2.5 8.5"
        stroke="var(--uk-error, #ef4444)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Column header label ────────────────────────────────────────────────────────

type ColumnId = 'queued' | 'uploading' | 'complete' | 'error';

const COLUMN_META: Record<ColumnId, { label: string; accent: string }> = {
  queued:    { label: 'Queued',    accent: 'var(--uk-border, rgba(255,255,255,0.12))' },
  uploading: { label: 'Uploading', accent: 'var(--uk-primary, #6366f1)' },
  complete:  { label: 'Complete',  accent: 'var(--uk-success, #22c55e)' },
  error:     { label: 'Error',     accent: 'var(--uk-error, #ef4444)' },
};

// ── Main component ─────────────────────────────────────────────────────────────

export const UploadKanban = forwardRef<HTMLDivElement, UploadKanbanProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, className },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // ── Upload logic ────────────────────────────────────────────────────────

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

        setEntries((prev) => [...prev, ...accepted]);

        const CONCURRENCY = 3;
        const results: UploadResult[] = [];

        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const out = await Promise.all(
            batch.map(async (entry) => {
              setEntries((prev) =>
                prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading' } : e)),
              );
              try {
                const r = await client.upload({
                  file: entry.file,
                  route,
                  ...(metadata !== undefined ? { metadata } : {}),
                  onProgress: (percent) =>
                    setEntries((prev) =>
                      prev.map((e) => (e.id === entry.id ? { ...e, progress: percent } : e)),
                    ),
                });
                setEntries((prev) =>
                  prev.map((e) =>
                    e.id === entry.id ? { ...e, status: 'success', progress: 100 } : e,
                  ),
                );
                return r;
              } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setEntries((prev) =>
                  prev.map((e) =>
                    e.id === entry.id ? { ...e, status: 'error', error: error.message } : e,
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

    function handleRetry(entry: FileEntry) {
      void processFiles([entry.file]);
      // Remove the errored entry so it doesn't duplicate
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    }

    // ── Derive columns ──────────────────────────────────────────────────────

    const queued    = entries.filter((e) => e.status === 'idle');
    const uploading = entries.filter((e) => e.status === 'uploading');
    const complete  = entries.filter((e) => e.status === 'success');
    const errors    = entries.filter((e) => e.status === 'error');
    const hasErrors = errors.length > 0;

    const columnCount = hasErrors ? 4 : 3;

    // ── Render helpers ──────────────────────────────────────────────────────

    const MotionDiv = animated && m ? (m.motion.div as React.ElementType) : null;
    const AnimatePresence = animated && m ? m.AnimatePresence : null;

    function renderCard(entry: FileEntry) {
      const isUploading = entry.status === 'uploading';
      const isSuccess   = entry.status === 'success';
      const isError     = entry.status === 'error';

      const cardContent = (
        <>
          {/* Card body */}
          <div
            className="uk-kanban__card-body"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
          >
            {/* Status indicator */}
            <span style={{ marginTop: 1, lineHeight: 0 }}>
              {isSuccess && <CheckIcon />}
              {isError   && <XIcon />}
              {isUploading && (
                // Spinning ring for in-progress
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  aria-hidden="true"
                  style={{
                    animation: 'uk-kanban-spin 0.8s linear infinite',
                    flexShrink: 0,
                  }}
                >
                  <circle
                    cx="5.5"
                    cy="5.5"
                    r="4"
                    fill="none"
                    stroke="var(--uk-primary, #6366f1)"
                    strokeWidth="1.5"
                    strokeDasharray="18 8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {entry.status === 'idle' && (
                // Hollow circle dot for queued
                <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle
                    cx="5.5"
                    cy="5.5"
                    r="4"
                    fill="none"
                    stroke="var(--uk-text-secondary, #71717a)"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </span>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="uk-kanban__card-name"
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--uk-text-primary, #fafafa)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.4,
                }}
                title={entry.file.name}
              >
                {entry.file.name}
              </p>
              <p
                className="uk-kanban__card-meta"
                style={{
                  margin: '2px 0 0',
                  fontSize: 11,
                  color: 'var(--uk-text-secondary, #71717a)',
                  lineHeight: 1.3,
                }}
              >
                {formatBytes(entry.file.size)}
                {isUploading && ` · ${entry.progress}%`}
              </p>
              {isError && entry.error && (
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 11,
                    color: 'var(--uk-error, #ef4444)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={entry.error}
                >
                  {entry.error}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar — only in Uploading column */}
          {isUploading && (
            <div
              className="uk-kanban__progress-track"
              aria-hidden="true"
              style={{
                marginTop: 8,
                height: 2,
                borderRadius: 2,
                background: 'var(--uk-border, rgba(255,255,255,0.08))',
                overflow: 'hidden',
              }}
            >
              <div
                className="uk-kanban__progress-fill"
                style={{
                  height: '100%',
                  width: `${entry.progress}%`,
                  background: 'var(--uk-primary, #6366f1)',
                  borderRadius: 2,
                  transition: 'width 0.15s ease-out',
                }}
              />
            </div>
          )}

          {/* Retry button — only on error cards */}
          {isError && (
            <button
              type="button"
              className="uk-kanban__retry"
              onClick={(e) => {
                e.stopPropagation();
                handleRetry(entry);
              }}
              style={{
                marginTop: 8,
                fontSize: 11,
                color: 'var(--uk-error, #ef4444)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Retry
            </button>
          )}
        </>
      );

      const commonProps = {
        className: 'uk-kanban__card',
        'data-status': entry.status,
        role: 'listitem' as const,
        'aria-label': `${entry.file.name}, ${entry.status}`,
        style: {
          background: 'var(--uk-bg, #0a0a0b)',
          border: '1px solid var(--uk-border, rgba(255,255,255,0.06))',
          borderRadius: 6,
          padding: 10,
          cursor: isError ? 'default' : 'default',
        } satisfies React.CSSProperties,
      };

      if (MotionDiv) {
        return (
          <MotionDiv
            key={entry.id}
            layoutId={entry.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            {...commonProps}
          >
            {cardContent}
          </MotionDiv>
        );
      }

      return (
        <div key={entry.id} {...commonProps}>
          {cardContent}
        </div>
      );
    }

    function renderColumn(id: ColumnId, columnEntries: FileEntry[]) {
      const meta = COLUMN_META[id];
      const count = columnEntries.length;

      const columnStyle: React.CSSProperties = {
        background: 'var(--uk-bg-secondary, #141416)',
        borderRadius: 8,
        padding: 8,
        borderLeft: `3px solid ${meta.accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minHeight: 0,
      };

      const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '1px solid var(--uk-border, rgba(255,255,255,0.06))',
      };

      const labelStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--uk-text-secondary, #71717a)',
        margin: 0,
      };

      const badgeStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 600,
        color: count > 0 ? 'var(--uk-text-primary, #fafafa)' : 'var(--uk-text-secondary, #71717a)',
        background: count > 0
          ? 'var(--uk-bg, rgba(255,255,255,0.06))'
          : 'transparent',
        border: '1px solid var(--uk-border, rgba(255,255,255,0.06))',
        borderRadius: 4,
        padding: '1px 5px',
        lineHeight: 1.6,
        minWidth: 18,
        textAlign: 'center',
      };

      const listStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flex: 1,
      };

      const dropHintStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        borderRadius: 6,
        border: '1px dashed var(--uk-border, rgba(255,255,255,0.08))',
        color: 'var(--uk-text-secondary, #71717a)',
        fontSize: 11,
        marginTop: count > 0 ? 6 : 0,
        opacity: 0.6,
      };

      // The Queued column doubles as the primary drop target
      const isQueued = id === 'queued';

      return (
        <div
          key={id}
          className={mergeClass('uk-kanban__column', `uk-kanban__column--${id}`)}
          data-column={id}
          data-active={count > 0 ? 'true' : 'false'}
          role="group"
          aria-label={`${meta.label} — ${count} file${count === 1 ? '' : 's'}`}
          style={columnStyle}
        >
          {/* Column header */}
          <div className="uk-kanban__column-header" style={headerStyle}>
            <p className="uk-kanban__column-label" style={labelStyle}>
              {meta.label}
            </p>
            <span className="uk-kanban__column-badge" style={badgeStyle}>
              {count}
            </span>
          </div>

          {/* Cards list */}
          <div className="uk-kanban__column-list" role="list" style={listStyle}>
            {AnimatePresence ? (
              <AnimatePresence mode="popLayout" initial={false}>
                {columnEntries.map((entry) => renderCard(entry))}
              </AnimatePresence>
            ) : (
              columnEntries.map((entry) => renderCard(entry))
            )}
          </div>

          {/* Queued column drop hint when empty */}
          {isQueued && count === 0 && (
            <div className="uk-kanban__drop-hint" style={dropHintStyle} aria-hidden="true">
              Drop files here
            </div>
          )}
        </div>
      );
    }

    // ── Container ───────────────────────────────────────────────────────────

    const containerStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      gap: 12,
      minHeight: 260,
      outline: isDragging ? '2px solid var(--uk-primary, #6366f1)' : 'none',
      outlineOffset: 2,
      borderRadius: 10,
      transition: 'outline 0.15s ease',
    };

    return (
      <>
        {/* Spin keyframes — injected once, harmless if duplicated */}
        <style>{`
          @keyframes uk-kanban-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div
          ref={ref}
          className={mergeClass('uk-kanban', className)}
          data-uk-element="container"
          data-dragging={isDragging ? 'true' : 'false'}
          role="region"
          aria-label="Upload pipeline"
          style={containerStyle}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          tabIndex={0}
          {...handlers}
        >
          {renderColumn('queued',    queued)}
          {renderColumn('uploading', uploading)}
          {renderColumn('complete',  complete)}
          {hasErrors && renderColumn('error', errors)}

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
      </>
    );
  },
);

UploadKanban.displayName = 'UploadKanban';
