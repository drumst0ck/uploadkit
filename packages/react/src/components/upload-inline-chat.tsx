// UploadInlineChat — ChatGPT/Linear composer attach pattern. Chip preview
// with Motion expand/collapse, animated remove, multiple parallel uploads.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadInlineChatProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  placeholder?: string;
  className?: string;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  abort?: AbortController;
};

const PAPERCLIP = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
const X_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

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

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export const UploadInlineChat = forwardRef<HTMLDivElement, UploadInlineChatProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, placeholder = 'Send a message...', className },
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
          if (reason) onUploadError?.(new Error(`${f.name} — ${reason}`));
          else accepted.push({ id: makeId(), file: f, status: 'idle', progress: 0 });
        }
        if (accepted.length === 0) return;
        setFiles((prev) => [...prev, ...accepted]);

        const results: UploadResult[] = [];
        await Promise.all(
          accepted.map(async (entry) => {
            const ctrl = new AbortController();
            setFiles((prev) =>
              prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading', abort: ctrl } : f)),
            );
            try {
              const r = await client.upload({
                file: entry.file,
                route,
                ...(metadata !== undefined ? { metadata } : {}),
                onProgress: (percent) =>
                  setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f))),
                signal: ctrl.signal,
              });
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, status: 'success', progress: 100 } : f)),
              );
              results.push(r);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              if (error.name !== 'AbortError') {
                setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, status: 'error' } : f)));
                onUploadError?.(error);
              }
            }
          }),
        );
        if (results.length > 0) onUploadComplete?.(results);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [client, route, accept, maxSize, maxFiles, onUploadError, onUploadComplete],
    );

    function removeChip(id: string) {
      setFiles((prev) => {
        const entry = prev.find((f) => f.id === id);
        entry?.abort?.abort();
        return prev.filter((f) => f.id !== id);
      });
    }

    function openPicker() {
      inputRef.current?.click();
    }

    const Chip = (props: { entry: FileEntry }) => {
      const { entry } = props;
      return (
        <span className="uk-inline-chat__chip" data-state={entry.status}>
          <span>{truncate(entry.file.name, 16)}</span>
          {entry.status === 'uploading' && (
            <span className="uk-inline-chat__chip-progress">{entry.progress}%</span>
          )}
          <button
            type="button"
            className="uk-inline-chat__chip-remove"
            aria-label={`Remove ${entry.file.name}`}
            onClick={(e) => {
              e.stopPropagation();
              removeChip(entry.id);
            }}
            dangerouslySetInnerHTML={{ __html: X_SMALL }}
          />
        </span>
      );
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-inline-chat', className)}
        data-uk-element="composer"
      >
        <button
          type="button"
          className="uk-inline-chat__attach"
          aria-label="Attach files"
          onClick={openPicker}
          dangerouslySetInnerHTML={{ __html: PAPERCLIP }}
        />

        <div className="uk-inline-chat__chips">
          {animated ? (
            <m.AnimatePresence initial={false}>
              {files.map((entry) => (
                <m.motion.span
                  key={entry.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ display: 'inline-flex' }}
                >
                  <Chip entry={entry} />
                </m.motion.span>
              ))}
            </m.AnimatePresence>
          ) : (
            files.map((entry) => <Chip key={entry.id} entry={entry} />)
          )}
        </div>

        <input
          type="text"
          className="uk-inline-chat__field"
          placeholder={placeholder}
          aria-label="Message"
        />

        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={maxFiles !== 1}
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

UploadInlineChat.displayName = 'UploadInlineChat';
