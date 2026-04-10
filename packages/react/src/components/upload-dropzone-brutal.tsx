// UploadDropzoneBrutal — brutalist web. Thick borders, hard shadow offset,
// stamp animation on drop. Inspired by neobrutalism + Cash App marketing.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadDropzoneBrutalProps = {
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

export const UploadDropzoneBrutal = forwardRef<HTMLDivElement, UploadDropzoneBrutalProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, disabled = false, className, children },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [stamped, setStamped] = useState(false);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    const triggerStamp = useCallback(() => {
      setStamped(true);
      const t = setTimeout(() => setStamped(false), 220);
      return () => clearTimeout(t);
    }, []);

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
        triggerStamp();
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
      [client, route, accept, maxSize, maxFiles, disabled, onUploadError, onUploadComplete, triggerStamp],
    );

    const { isDragging, handlers } = useDragState(processFiles);

    function openPicker() {
      if (disabled) return;
      inputRef.current?.click();
    }

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : 'idle';

    const completed = files.filter((f) => f.status === 'success').length;
    const inner = (
      <>
        <h3 className="uk-dropzone-brutal__title">{children ?? 'DROP IT'}</h3>
        <p className="uk-dropzone-brutal__counter">
          {files.length === 0 ? 'no files yet' : `${completed} / ${files.length} done`}
        </p>
      </>
    );

    return (
      <>
        {animated ? (
          <m.motion.div
            ref={ref}
            className={mergeClass('uk-dropzone-brutal', className)}
            data-uk-element="container"
            data-state={containerState}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label="Drop files to upload"
            animate={stamped ? { scale: [1, 0.94, 1] } : { scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            {...handlers}
            onClick={openPicker}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
          >
            {inner}
          </m.motion.div>
        ) : (
          <div
            ref={ref}
            className={mergeClass(
              `uk-dropzone-brutal${stamped ? ' uk-brutal-stamped' : ''}`,
              className,
            )}
            data-uk-element="container"
            data-state={containerState}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label="Drop files to upload"
            {...handlers}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
          >
            {inner}
          </div>
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
          disabled={disabled}
        />
      </>
    );
  },
);

UploadDropzoneBrutal.displayName = 'UploadDropzoneBrutal';
