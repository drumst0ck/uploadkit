// UploadDropzoneAurora — inspired by Apple & Supabase. Animated conic-gradient
// mesh + cursor-follow specular highlight. Static fallback uses CSS keyframes.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadDropzoneAuroraProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
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

export const UploadDropzoneAurora = forwardRef<HTMLDivElement, UploadDropzoneAuroraProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, disabled = false, className, children },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    const processFiles = useCallback(
      async (incoming: File[]) => {
        if (disabled) return;
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];
        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) onUploadError?.(new Error(`${f.name} — ${reason}`));
          else accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0 });
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
      [client, route, accept, maxSize, maxFiles, disabled, onUploadError, onUploadComplete],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      if (disabled) return;
      inputRef.current?.click();
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    function handleMouseLeave() {
      setCursor(null);
    }

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : 'idle';

    const meshScale = isDragging ? 1.55 : 1.4;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-dropzone-aurora', className)}
        data-uk-element="container"
        data-state={containerState}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Drop files to upload"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...handlers}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {animated ? (
          <m.motion.div
            className="uk-dropzone-aurora__mesh"
            style={{ animation: 'none' }}
            animate={{ rotate: 360, scale: meshScale }}
            transition={{
              rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
              scale: { duration: 0.6, ease: 'easeOut' },
            }}
          />
        ) : (
          <div className="uk-dropzone-aurora__mesh" aria-hidden="true" />
        )}

        {cursor && (
          <div
            className="uk-dropzone-aurora__highlight"
            style={{ left: cursor.x - 100, top: cursor.y - 100 }}
            aria-hidden="true"
          />
        )}

        <div className="uk-dropzone-aurora__inner">
          <h3 className="uk-dropzone-aurora__title">{children ?? 'Drop files to upload'}</h3>
          {accept && accept.length > 0 && (
            <p className="uk-dropzone-aurora__subtitle">{accept.join(', ')}</p>
          )}

          {files.length > 0 && (
            <div className="uk-dropzone-aurora__list">
              {files.map((f) => (
                <div key={f.id} className="uk-dropzone-aurora__chip" data-state={f.status}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.file.name}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>{f.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
          disabled={disabled}
        />
      </div>
    );
  },
);

UploadDropzoneAurora.displayName = 'UploadDropzoneAurora';
