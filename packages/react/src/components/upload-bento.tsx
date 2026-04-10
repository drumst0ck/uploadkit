// UploadBento — CSS grid bento layout where every third cell spans 2 columns.
// Each cell is a mini upload card. Completed cells reorder via Motion layout
// animation when available. Inspired by Apple iPadOS widgets and Raycast themes.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { getFileTypeIcon } from '../utils/file-icons';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadBentoProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  columns?: number;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
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

export const UploadBento = forwardRef<HTMLDivElement, UploadBentoProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, columns = 3, onUploadComplete, onUploadError, className },
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
                setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, status: 'error' } : f)));
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

    const ordered = [...files].sort((a, b) => {
      const rank = (s: FileEntry['status']) => (s === 'success' ? 0 : s === 'uploading' ? 1 : s === 'error' ? 2 : 3);
      return rank(a.status) - rank(b.status);
    });

    const containerState = isDragging ? 'dragging' : files.some((f) => f.status === 'uploading') ? 'uploading' : 'idle';

    const MotionDiv = animated && m ? m.motion.div : null;

    const gridStyle: React.CSSProperties = {
      ['--uk-bento-cols' as string]: String(columns),
    };

    const renderCell = (entry: FileEntry, i: number) => {
      const span = (i + 1) % 3 === 0 ? 2 : 1;
      const content = (
        <>
          <div
            className="uk-bento__cell-icon"
            dangerouslySetInnerHTML={{ __html: getFileTypeIcon(entry.file.type) }}
          />
          <p className="uk-bento__cell-name">{entry.file.name}</p>
          <p className="uk-bento__cell-meta">
            {formatBytes(entry.file.size)} · {entry.progress}%
          </p>
          <div className="uk-bento__cell-progress" aria-hidden="true">
            <span style={{ width: `${entry.progress}%` }} />
          </div>
        </>
      );
      const commonProps = {
        'data-span': String(span),
        'data-state': entry.status,
        role: 'progressbar' as const,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': entry.progress,
        'aria-label': `${entry.file.name} upload progress`,
      };
      return MotionDiv ? (
        <MotionDiv
          key={entry.id}
          layout
          layoutId={entry.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="uk-bento__cell"
          {...commonProps}
        >
          {content}
        </MotionDiv>
      ) : (
        <div key={entry.id} className="uk-bento__cell" {...commonProps}>
          {content}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-bento', className)}
        data-uk-element="container"
        data-state={containerState}
        role="region"
        aria-label="Upload bento grid"
        tabIndex={0}
        style={gridStyle}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        {...handlers}
      >
        {ordered.length === 0 ? (
          <div className="uk-bento__empty">Drop files or click to build your bento.</div>
        ) : (
          ordered.map((entry, i) => renderCell(entry, i))
        )}

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

UploadBento.displayName = 'UploadBento';
