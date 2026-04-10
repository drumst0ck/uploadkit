// UploadCloudRain — cloud icon with droplets raining down into it as files are
// dropped. Aggregate progress fills the cloud from bottom to top via a clip
// rect. Inspired by iCloud sync and the Dropbox onboarding animation.

import { forwardRef, useCallback, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadCloudRainProps = {
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

export const UploadCloudRain = forwardRef<HTMLDivElement, UploadCloudRainProps>(
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

    const active = files.length;
    const globalProgress =
      active === 0 ? 0 : Math.round(files.reduce((sum, f) => sum + f.progress, 0) / active);

    const containerState = isDragging
      ? 'dragging'
      : files.some((f) => f.status === 'uploading')
        ? 'uploading'
        : active > 0 && files.every((f) => f.status === 'success')
          ? 'success'
          : 'idle';

    // Cloud SVG — 140×80 path, the fill rect clip is driven by globalProgress.
    const cloudHeight = 60;
    const fillHeight = (globalProgress / 100) * cloudHeight;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-cloud-rain', className)}
        data-uk-element="container"
        data-state={containerState}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={globalProgress}
        aria-label={active === 0 ? 'Drop files to upload' : `Upload progress: ${globalProgress}%`}
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
        <div className="uk-cloud-rain__cloud" aria-hidden="true">
          <svg viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="uk-cloud-rain-clip">
                <path d="M30 60 Q15 60 15 45 Q15 30 32 28 Q36 14 54 14 Q70 14 74 28 Q94 22 100 42 Q120 44 120 60 Z" />
              </clipPath>
            </defs>
            <path
              d="M30 60 Q15 60 15 45 Q15 30 32 28 Q36 14 54 14 Q70 14 74 28 Q94 22 100 42 Q120 44 120 60 Z"
              fill="var(--uk-cloud-fill)"
              stroke="var(--uk-cloud-stroke)"
              strokeWidth={2}
            />
            <rect
              x={0}
              y={60 - fillHeight}
              width={140}
              height={fillHeight}
              fill="var(--uk-cloud-stroke)"
              opacity={0.55}
              clipPath="url(#uk-cloud-rain-clip)"
              style={animated ? { transition: 'y 320ms ease-out, height 320ms ease-out' } : undefined}
            />
          </svg>
        </div>

        <div className="uk-cloud-rain__drops" aria-hidden="true">
          {files
            .filter((f) => f.status === 'uploading' || f.status === 'idle')
            .map((entry, i) => {
              const leftPct = 20 + ((i * 17) % 60);
              const style: React.CSSProperties = {
                left: `${leftPct}%`,
                animationDelay: `${i * 120}ms`,
                ['--uk-rain-target' as string]: '80px',
              };
              return <span key={entry.id} className="uk-cloud-rain__drop" style={style} />;
            })}
        </div>

        <p className="uk-cloud-rain__caption">
          {children ?? (active === 0 ? 'Drop files into the cloud' : `${active} uploading — ${globalProgress}%`)}
        </p>

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

UploadCloudRain.displayName = 'UploadCloudRain';
