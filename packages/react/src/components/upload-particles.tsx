// UploadParticles — constellation of particles converging to the center as
// upload progress advances. Pure CSS transforms (no canvas / WebGL). Inspired
// by the Stripe 3D Secure loading screen and the Vercel Ship 2023 hero.

import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadParticlesProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  particleCount?: number;
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

type Particle = { x: number; y: number };

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

export const UploadParticles = forwardRef<HTMLDivElement, UploadParticlesProps>(
  (
    {
      route,
      accept,
      maxSize,
      maxFiles,
      metadata,
      particleCount = 40,
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
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Deterministic-per-mount particle positions scattered in a 260×260 region.
    const particles = useMemo<Particle[]>(() => {
      const result: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        result.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
      }
      return result;
    }, [particleCount]);

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
        : 'idle';

    const containerStyle: React.CSSProperties = {
      ['--uk-progress' as string]: `${globalProgress / 100}`,
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-particles', className)}
        data-uk-element="container"
        data-state={containerState}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={globalProgress}
        aria-label={active === 0 ? 'Click to upload files' : `Upload progress: ${globalProgress}%`}
        tabIndex={0}
        style={containerStyle}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        {...handlers}
      >
        <div className="uk-particles__canvas" aria-hidden="true">
          {particles.map((p, i) => {
            const style: React.CSSProperties = {
              ['--uk-particle-x' as string]: `${p.x}px`,
              ['--uk-particle-y' as string]: `${p.y}px`,
            };
            return <span key={i} className="uk-particles__dot" style={style} />;
          })}
        </div>

        <div className="uk-particles__label">
          {active === 0
            ? 'Drop to upload'
            : containerState === 'uploading'
              ? `${globalProgress}%`
              : `${active} file${active === 1 ? '' : 's'}`}
        </div>

        {/* Keep hook reference so ESLint stays quiet and future Motion paths can be added. */}
        {animated && m ? null : null}

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

UploadParticles.displayName = 'UploadParticles';
