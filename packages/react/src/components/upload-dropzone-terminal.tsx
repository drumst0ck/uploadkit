// UploadDropzoneTerminal — inspired by Raycast & Warp. Mono prompt, blinking
// cursor, tail-style accepted-file log. Animated with Motion when available.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadDropzoneTerminalProps = {
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
  errorMsg?: string;
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

function fmtLine(f: FileEntry): { tag: string; body: string } {
  if (f.status === 'success') return { tag: '[OK] ', body: `${f.file.name} (${formatBytes(f.file.size)}) ✓` };
  if (f.status === 'error') return { tag: '[ERR]', body: `${f.file.name} — ${f.errorMsg ?? 'failed'}` };
  if (f.status === 'uploading') return { tag: '[..] ', body: `${f.file.name} ${f.progress}%` };
  return { tag: '[..] ', body: `${f.file.name} queued` };
}

export const UploadDropzoneTerminal = forwardRef<HTMLDivElement, UploadDropzoneTerminalProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, disabled = false, className, children },
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
        if (disabled) return;
        const trimmed = maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;
        const accepted: FileEntry[] = [];
        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
            setFiles((prev) => [...prev, { id: makeId(), file: f, status: 'error', progress: 0, errorMsg: reason }]);
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
                  prev.map((f) => (f.id === entry.id ? { ...f, status: 'error', errorMsg: error.message } : f)),
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
      [client, route, accept, maxSize, maxFiles, disabled, onUploadError, onUploadComplete],
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

    const Line = (props: { entry: FileEntry }) => {
      const { entry } = props;
      const { tag, body } = fmtLine(entry);
      return (
        <div className="uk-dropzone-terminal__line" data-state={entry.status}>
          <span style={{ opacity: 0.7, marginRight: 6 }}>{tag}</span>
          {body}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-dropzone-terminal', className)}
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
        <div className="uk-dropzone-terminal__prompt">
          <span>&gt; {children ?? 'drop files to upload'}</span>
          <span className="uk-dropzone-terminal__cursor" aria-hidden="true">▋</span>
        </div>

        {files.length > 0 && (
          <div className="uk-dropzone-terminal__log" aria-live="polite">
            {animated ? (
              <m.AnimatePresence initial={false}>
                {files.map((entry) => (
                  <m.motion.div
                    key={entry.id}
                    initial={{ x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <Line entry={entry} />
                  </m.motion.div>
                ))}
              </m.AnimatePresence>
            ) : (
              files.map((entry) => <Line key={entry.id} entry={entry} />)
            )}
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
      </div>
    );
  },
);

UploadDropzoneTerminal.displayName = 'UploadDropzoneTerminal';
