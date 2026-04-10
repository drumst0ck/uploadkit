// UploadProgressStacked — multi-file vertical list inspired by iOS AirDrop and
// Telegram multi-send. Each row shows a progress bar and percent; successful
// rows float to the top when Motion layout animations are available.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadProgressStackedProps = {
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

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(file: File, accept?: string[], maxSize?: number): string | null {
  if (accept && accept.length > 0) {
    const ok = accept.some((p) => (p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p));
    if (!ok) return 'type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

export const UploadProgressStacked = forwardRef<HTMLDivElement, UploadProgressStackedProps>(
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
            accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0 });
          }
        }
        if (accepted.length === 0) return;
        setFiles((prev) => [...prev, ...accepted]);

        const CONCURRENCY = 3;
        const results: UploadResult[] = [];
        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const out = await Promise.all(
            batch.map(async (entry) => {
              setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' } : f)));
              try {
                const r = await client.upload({
                  file: entry.file,
                  route,
                  ...(metadata !== undefined ? { metadata } : {}),
                  onProgress: (percent) =>
                    setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f))),
                });
                setFiles((prev) =>
                  prev.map((f) => (f.id === entry.id ? { ...f, status: 'success', progress: 100 } : f)),
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

    // Successful rows sort to the top (AirDrop-style).
    const ordered = [...files].sort((a, b) => {
      const rank = (s: FileEntry['status']) => (s === 'success' ? 0 : s === 'uploading' ? 1 : s === 'error' ? 2 : 3);
      return rank(a.status) - rank(b.status);
    });

    const containerState = isDragging ? 'dragging' : files.some((f) => f.status === 'uploading') ? 'uploading' : 'idle';

    const MotionDiv = animated && m ? m.motion.div : null;
    const AnimatePresence = animated && m ? m.AnimatePresence : null;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-stacked', className)}
        data-uk-element="container"
        data-state={containerState}
        {...handlers}
      >
        <div
          className="uk-progress-stacked__header"
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          aria-label="Drop files or click to select"
        >
          <h3 className="uk-progress-stacked__header-title">{children ?? 'Drop or select files'}</h3>
          <p className="uk-progress-stacked__header-sub">
            {files.length === 0 ? 'Ready when you are.' : `${files.length} file${files.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {ordered.length > 0 ? (
          <div className="uk-progress-stacked__list">
            {AnimatePresence && MotionDiv ? (
              <AnimatePresence initial={false}>
                {ordered.map((entry) => (
                  <MotionDiv
                    key={entry.id}
                    layout
                    layoutId={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="uk-progress-stacked__row"
                    data-state={entry.status}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={entry.progress}
                    aria-label={`${entry.file.name} upload progress`}
                  >
                    <span className="uk-progress-stacked__row-name">{entry.file.name}</span>
                    <span className="uk-progress-stacked__row-bar">
                      <span style={{ width: `${entry.progress}%` }} />
                    </span>
                    <span className="uk-progress-stacked__row-percent">{entry.progress}%</span>
                  </MotionDiv>
                ))}
              </AnimatePresence>
            ) : (
              ordered.map((entry) => (
                <div
                  key={entry.id}
                  className="uk-progress-stacked__row"
                  data-state={entry.status}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={entry.progress}
                  aria-label={`${entry.file.name} upload progress`}
                >
                  <span className="uk-progress-stacked__row-name">{entry.file.name}</span>
                  <span className="uk-progress-stacked__row-bar">
                    <span style={{ width: `${entry.progress}%` }} />
                  </span>
                  <span className="uk-progress-stacked__row-percent">{entry.progress}%</span>
                </div>
              ))
            )}
          </div>
        ) : null}

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

UploadProgressStacked.displayName = 'UploadProgressStacked';
