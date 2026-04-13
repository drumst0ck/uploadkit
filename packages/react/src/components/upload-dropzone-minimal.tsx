// UploadDropzoneMinimal — inspired by Stripe & Resend. Ultra-clean, lots of
// whitespace, thin 1px borders, monochrome palette with one accent color.
// Border pulses subtly on drag-over via motion spring. File chips fade in
// with staggered entrance. Zero gradients, zero shadows — restraint as craft.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { getUploadIcon } from '../utils/file-icons';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadDropzoneMinimalProps = {
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

export const UploadDropzoneMinimal = forwardRef<HTMLDivElement, UploadDropzoneMinimalProps>(
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

    // Thin upload icon — 32×32, 1.5px stroke weight for the minimal aesthetic.
    // Swapped from the default 48px glass icon so proportions feel lighter here.
    const iconStyle: React.CSSProperties = {
      width: 32,
      height: 32,
      color: 'var(--uk-text-secondary)',
      flexShrink: 0,
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-dropzone-minimal', className)}
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
        {/* Animated border ring on drag-over — motion spring for natural feel.
            Rendered as an absolutely-positioned inset overlay so it doesn't
            affect layout. Falls back to the CSS [data-state="dragging"] rule
            when motion is unavailable or reduced-motion is preferred. */}
        {animated ? (
          <m.motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              border: '1px solid transparent',
            }}
            animate={{
              borderColor: isDragging
                ? 'var(--uk-primary)'
                : 'transparent',
              boxShadow: isDragging
                ? '0 0 0 4px rgba(var(--uk-primary-rgb, 0 112 243), 0.08)'
                : '0 0 0 0px rgba(0,0,0,0)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        ) : null}

        {/* Upload icon */}
        <div style={iconStyle} dangerouslySetInnerHTML={{ __html: getUploadIcon() }} />

        {/* Primary label */}
        <h3 className="uk-dropzone-minimal__title">
          {children ?? 'Drop files here or click to upload'}
        </h3>

        {/* Accept / size hint */}
        {(accept && accept.length > 0 || maxSize !== undefined) && (
          <p className="uk-dropzone-minimal__subtitle">
            {[
              accept && accept.length > 0 ? accept.join(', ') : null,
              maxSize !== undefined ? `up to ${formatBytes(maxSize)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {/* File chip list — staggered fade-in with motion when available */}
        {files.length > 0 && (
          <div className="uk-dropzone-minimal__list" onClick={(e) => e.stopPropagation()}>
            {files.map((f, index) => {
              const chipContent = (
                <>
                  {/* Status dot */}
                  <span
                    className="uk-dropzone-minimal__chip-dot"
                    data-state={f.status}
                    aria-hidden="true"
                  />
                  {/* File name */}
                  <span className="uk-dropzone-minimal__chip-name">
                    {f.file.name}
                  </span>
                  {/* File size */}
                  <span className="uk-dropzone-minimal__chip-size">
                    {formatBytes(f.file.size)}
                  </span>
                  {/* Progress bar — sits at the very bottom of the chip */}
                  <div className="uk-dropzone-minimal__chip-bar">
                    <span style={{ width: `${f.progress}%` }} />
                  </div>
                </>
              );

              if (animated) {
                return (
                  <m.motion.div
                    key={f.id}
                    className="uk-dropzone-minimal__chip"
                    data-state={f.status}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.06 }}
                  >
                    {chipContent}
                  </m.motion.div>
                );
              }

              return (
                <div key={f.id} className="uk-dropzone-minimal__chip" data-state={f.status}>
                  {chipContent}
                </div>
              );
            })}
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

UploadDropzoneMinimal.displayName = 'UploadDropzoneMinimal';
