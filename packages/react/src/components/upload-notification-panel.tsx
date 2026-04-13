import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type FileEntry = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: Error | undefined;
  abortController?: AbortController | undefined;
};

export type UploadNotificationPanelProps = {
  /** Route name defined in your fileRouter */
  route: string;
  /** Accepted MIME types (UX validation only — server enforces authoritative check) */
  accept?: string[];
  /** Maximum file size in bytes (UX validation only) */
  maxSize?: number;
  /** Maximum number of files per batch */
  maxFiles?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Called after all accepted files finish uploading successfully */
  onUploadComplete?: (results: UploadResult[]) => void;
  /** Called when any individual upload fails */
  onUploadError?: (error: Error) => void;
  /** Additional CSS class(es) for the panel wrapper */
  className?: string;
};

/** Imperative handle — allows parent components to programmatically enqueue files */
export type UploadNotificationPanelHandle = {
  addFiles: (files: File[]) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function nextId(): string {
  return `uk-np-${++_id}`;
}

// ─── Inline SVG atoms ─────────────────────────────────────────────────────────

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
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
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUploadCloud({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

// ─── Drag-over overlay ────────────────────────────────────────────────────────

function DragOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '12px',
        border: '2px dashed var(--uk-accent, #6366f1)',
        background: 'rgba(99, 102, 241, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        pointerEvents: 'none',
        zIndex: 10,
        color: 'var(--uk-accent, #6366f1)',
      }}
    >
      <IconUploadCloud size={28} />
      <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '-0.01em' }}>
        Drop to upload
      </span>
    </div>
  );
}

// ─── Individual file row ──────────────────────────────────────────────────────

type FileRowProps = {
  entry: FileEntry;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
  // motion module is passed down so rows can animate if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  motion: any | null;
  reduceMotion: boolean;
};

function FileRow({ entry, onCancel, onDismiss, motion: m, reduceMotion }: FileRowProps) {
  const isComplete = entry.status === 'success';
  const isError = entry.status === 'error';
  const isUploading = entry.status === 'uploading';

  // Auto-dismiss completed rows after 3 seconds
  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => onDismiss(entry.id), 3000);
    return () => clearTimeout(timer);
  }, [isComplete, entry.id, onDismiss]);

  const rowContent = (
    <div
      className="uk-notification-panel__file-row"
      data-state={entry.status}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--uk-border)',
        opacity: isComplete ? 0.7 : 1,
        transition: 'opacity 0.3s ease',
        minWidth: 0,
      }}
    >
      {/* File info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span
            className="uk-notification-panel__file-name"
            title={entry.file.name}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--uk-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {entry.file.name}
          </span>
          <span
            className="uk-notification-panel__file-size"
            style={{
              fontSize: '11px',
              color: 'var(--uk-text-secondary)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {formatBytes(entry.file.size)}
          </span>
        </div>

        {/* Progress bar — shown only while uploading */}
        {isUploading && (
          <div
            className="uk-notification-panel__progress-track"
            style={{
              height: '2px',
              background: 'var(--uk-border)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
            role="progressbar"
            aria-valuenow={entry.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Uploading ${entry.file.name}: ${entry.progress}%`}
          >
            <div
              className="uk-notification-panel__progress-fill"
              style={{
                height: '100%',
                width: `${entry.progress}%`,
                background: 'var(--uk-accent, #6366f1)',
                borderRadius: '999px',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        )}

        {/* Error message */}
        {isError && entry.error && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--uk-error, #ef4444)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={entry.error.message}
          >
            {entry.error.message}
          </span>
        )}
      </div>

      {/* Right-side status indicator / cancel button */}
      {isComplete && (
        <span
          aria-label="Upload complete"
          style={{
            color: 'var(--uk-success, #22c55e)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <IconCheck size={14} />
        </span>
      )}

      {isError && (
        <button
          type="button"
          onClick={() => onDismiss(entry.id)}
          aria-label={`Dismiss error for ${entry.file.name}`}
          className="uk-notification-panel__dismiss-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--uk-error, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
            flexShrink: 0,
            borderRadius: '4px',
            transition: 'opacity 0.15s ease',
          }}
        >
          <IconX size={12} />
        </button>
      )}

      {(entry.status === 'idle' || isUploading) && (
        <button
          type="button"
          onClick={() => onCancel(entry.id)}
          aria-label={`Cancel upload of ${entry.file.name}`}
          className="uk-notification-panel__cancel-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--uk-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
            flexShrink: 0,
            borderRadius: '4px',
            opacity: 0.6,
            transition: 'opacity 0.15s ease',
          }}
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );

  // Animated row if motion is available and reduced-motion is not preferred
  if (m && !reduceMotion) {
    const MDiv = m.motion.div;
    return (
      <MDiv
        key={entry.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        layout
      >
        {rowContent}
      </MDiv>
    );
  }

  return <div key={entry.id}>{rowContent}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * UploadNotificationPanel — an inline upload manager panel that sits in the
 * document flow inside its parent container.
 *
 * Architecture:
 *  - Renders inline (position: relative) at 320px wide — no fixed positioning.
 *    This makes it work correctly inside doc previews, landing showcases, etc.
 *  - Always visible: when there are no files, shows a compact empty-state drop zone.
 *  - Accepts files via drag-and-drop OR the "+" file picker button.
 *  - Exposes `addFiles(files: File[])` via useImperativeHandle for programmatic use.
 *  - Concurrent uploads: max 3 in-flight at a time (same pattern as UploadDropzone).
 *  - Completed files auto-dismiss after 3 s.
 *  - Motion (optional peer dep): file row slide-from-right animation.
 */
export const UploadNotificationPanel = forwardRef<
  UploadNotificationPanelHandle,
  UploadNotificationPanelProps
>(
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

    const m = useOptionalMotion();
    const reduceMotion = useReducedMotionSafe();

    // ── Validation ────────────────────────────────────────────────────────────

    function validateFile(file: File): string | null {
      if (accept && accept.length > 0) {
        const allowed = accept.some((pattern) => {
          if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
          return file.type === pattern;
        });
        if (!allowed) {
          return `${file.name} type not allowed`;
        }
      }
      if (maxSize !== undefined && file.size > maxSize) {
        return `${file.name} exceeds ${formatBytes(maxSize)}`;
      }
      return null;
    }

    // ── Single file uploader ──────────────────────────────────────────────────

    const uploadFile = useCallback(
      async (entry: FileEntry): Promise<UploadResult | null> => {
        const controller = new AbortController();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'uploading', abortController: controller }
              : f,
          ),
        );

        try {
          const result = await client.upload({
            file: entry.file,
            route,
            ...(metadata !== undefined ? { metadata } : {}),
            onProgress: (percent) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
              );
            },
            signal: controller.signal,
          });

          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'success', progress: 100, abortController: undefined }
                : f,
            ),
          );

          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          if (error.name !== 'AbortError') {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, status: 'error', progress: 0, error, abortController: undefined }
                  : f,
              ),
            );
            onUploadError?.(error);
          } else {
            // Aborted — remove file from list entirely
            setFiles((prev) => prev.filter((f) => f.id !== entry.id));
          }

          return null;
        }
      },
      [client, route, metadata, onUploadError],
    );

    // ── Batch runner (CONCURRENCY = 3) ────────────────────────────────────────

    const runBatchUploads = useCallback(
      async (accepted: FileEntry[]) => {
        const CONCURRENCY = 3;
        const results: UploadResult[] = [];

        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(batch.map((e) => uploadFile(e)));
          for (const r of batchResults) {
            if (r !== null) results.push(r);
          }
        }

        if (results.length > 0 && results.length === accepted.length) {
          onUploadComplete?.(results);
        }
      },
      [uploadFile, onUploadComplete],
    );

    // ── File intake (shared by drag-drop, picker, and imperative addFiles) ────

    const processFiles = useCallback(
      async (incoming: File[]) => {
        const toProcess = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;

        const accepted: FileEntry[] = [];

        for (const file of toProcess) {
          const rejection = validateFile(file);
          if (!rejection) {
            accepted.push({ id: nextId(), file, status: 'idle', progress: 0 });
          }
          // Silently skip rejected files (panel is a background manager, not inline validation UI)
        }

        if (accepted.length === 0) return;

        setFiles((prev) => [...prev, ...accepted]);

        await runBatchUploads(accepted);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [maxFiles, accept, maxSize, runBatchUploads],
    );

    // ── Drag-and-drop ─────────────────────────────────────────────────────────

    const { isDragging, handlers: dragHandlers } = useDragState(processFiles);

    // ── Imperative handle ─────────────────────────────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        addFiles: (files: File[]) => void processFiles(files),
      }),
      [processFiles],
    );

    // ── File actions ──────────────────────────────────────────────────────────

    function cancelFile(id: string) {
      setFiles((prev) => {
        const entry = prev.find((f) => f.id === id);
        entry?.abortController?.abort();
        return prev.filter((f) => f.id !== id);
      });
    }

    function dismissFile(id: string) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }

    // ── Picker button handler ─────────────────────────────────────────────────

    function handlePickerClick() {
      inputRef.current?.click();
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) void processFiles(selected);
      e.target.value = '';
    }

    // ── Motion helpers ────────────────────────────────────────────────────────

    const AnimatePresence = m?.AnimatePresence ?? null;
    const MDiv = m?.motion?.div ?? null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
      <div
        className={mergeClass('uk-notification-panel', className)}
        data-uk-element="notification-panel"
        // Drag-and-drop applied to the whole wrapper so dropping anywhere on the panel works
        {...dragHandlers}
        style={{
          // Inline positioning — sits in document flow inside the parent container.
          // Use position: relative so the DragOverlay (absolute) is clipped correctly.
          position: 'relative',
          display: 'inline-block',
          width: '320px',
        }}
      >
        {/* Card — always visible */}
        <div
          className="uk-notification-panel__card"
          style={{
            background: 'var(--uk-bg)',
            border: '1px solid var(--uk-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            width: '100%',
            // Relative so DragOverlay can be positioned inside
            position: 'relative',
          }}
        >
          {/* Card header */}
          <div
            className="uk-notification-panel__header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: '1px solid var(--uk-border)',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--uk-text)',
                letterSpacing: '-0.01em',
              }}
            >
              Uploads
            </span>

            {/* Add files button */}
            <button
              type="button"
              onClick={handlePickerClick}
              aria-label="Add files"
              className="uk-notification-panel__add-btn"
              style={{
                background: 'none',
                border: '1px solid var(--uk-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--uk-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              <IconPlus size={12} />
            </button>
          </div>

          {/* File list — empty state when no files queued */}
          <div
            className="uk-notification-panel__file-list"
            style={{ maxHeight: '240px', overflowY: 'auto' }}
            role="list"
            aria-label="Upload queue"
            aria-live="polite"
          >
            {files.length === 0 ? (
              // Empty state — always shown when there are no files
              <div
                className="uk-notification-panel__empty-state"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '28px 16px',
                  color: 'var(--uk-text-secondary)',
                  textAlign: 'center',
                }}
              >
                <span style={{ opacity: 0.4 }}>
                  <IconUploadCloud size={28} />
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--uk-text-secondary)',
                  }}
                >
                  Drop files here or click + to add
                </span>
              </div>
            ) : AnimatePresence && MDiv && !reduceMotion ? (
              <AnimatePresence initial={false}>
                {files.map((entry) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    onCancel={cancelFile}
                    onDismiss={dismissFile}
                    motion={m}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </AnimatePresence>
            ) : (
              files.map((entry) => (
                <FileRow
                  key={entry.id}
                  entry={entry}
                  onCancel={cancelFile}
                  onDismiss={dismissFile}
                  motion={null}
                  reduceMotion={true}
                />
              ))
            )}
          </div>

          {/* Drag-over overlay rendered inside the card */}
          <DragOverlay visible={isDragging} />
        </div>

        {/* Hidden file input for the "+" picker button */}
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          hidden
          accept={accept?.join(',')}
          onChange={handleInputChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Screen-reader live region for status announcements */}
        <span
          className="uk-sr-only"
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
            border: 0,
          }}
        >
          {(() => {
            const uploading = files.filter((f) => f.status === 'uploading').length;
            const complete = files.filter((f) => f.status === 'success').length;
            if (uploading > 0) return `${uploading} file${uploading !== 1 ? 's' : ''} uploading, ${complete} complete`;
            if (complete > 0 && complete === files.length) return `All ${complete} file${complete !== 1 ? 's' : ''} uploaded`;
            return '';
          })()}
        </span>
      </div>
    );
  },
);

UploadNotificationPanel.displayName = 'UploadNotificationPanel';
