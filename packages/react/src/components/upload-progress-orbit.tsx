// UploadProgressOrbit — circular orbit of satellites, one per in-flight file,
// drawing into the center as each upload completes. Inspired by the Arc browser
// toolbar and the Raycast command palette.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { getUploadIcon } from '../utils/file-icons';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadProgressOrbitProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  radius?: number;
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

export const UploadProgressOrbit = forwardRef<HTMLDivElement, UploadProgressOrbitProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, radius = 80, onUploadComplete, onUploadError, className },
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
                  prev.map((f) => (f.id === entry.id ? { ...f, status: 'error', progress: 0 } : f)),
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

    const active = files.length;
    const globalProgress =
      active === 0 ? 0 : Math.round(files.reduce((sum, f) => sum + f.progress, 0) / active);

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : files.length > 0 && files.every((f) => f.status === 'success')
          ? 'success'
          : 'idle';

    return (
      <div
        ref={ref}
        className={mergeClass('uk-progress-orbit', className)}
        data-uk-element="container"
        data-state={containerState}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={globalProgress}
        aria-label={active === 0 ? 'Click to upload files' : `Overall upload progress: ${globalProgress}%`}
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        {...handlers}
      >
        <div
          className="uk-progress-orbit__center"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getUploadIcon() }}
        />

        <div className="uk-progress-orbit__ring" aria-hidden="true">
          {files.map((entry, i) => {
            const angle = (i / Math.max(1, files.length)) * Math.PI * 2;
            // As progress goes 0 → 100, satellite radius collapses to 0.
            const r = radius * (1 - entry.progress / 100);
            const style: React.CSSProperties = {
              ['--uk-orbit-angle' as string]: `${angle}rad`,
              ['--uk-orbit-radius' as string]: `${r}px`,
            };
            return (
              <div
                key={entry.id}
                className="uk-progress-orbit__satellite"
                data-state={entry.status}
                style={style}
              >
                {entry.status === 'success' ? '✓' : `${entry.progress}%`}
              </div>
            );
          })}
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
        />

        {/* Motion marker — referenced only to keep `m`/`animated` hooks wired for
            consumers extending the component. Visual path identical either way. */}
        {animated && m ? null : null}
      </div>
    );
  },
);

UploadProgressOrbit.displayName = 'UploadProgressOrbit';
