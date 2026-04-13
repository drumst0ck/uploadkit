// UploadAttachmentTray — Discord/iMessage-inspired horizontal scrollable
// attachment tray for multi-file uploads. Sits below a text input. Each file
// appears as a 72×72 card with thumbnail preview, SVG progress ring, and a
// remove button. An "attach" button (paperclip + dashed card) opens the
// file picker. Cards animate in with Motion spring when available.

import { forwardRef, useCallback, useRef, useState, useEffect } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadAttachmentTrayProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

type FileEntry = {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  thumbnailUrl?: string;
  abort?: AbortController;
};

// ---------------------------------------------------------------------------
// SVG icon strings (avoids extra deps; dangerouslySetInnerHTML used inline)
// ---------------------------------------------------------------------------

const PAPERCLIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

// Generic file-type icon rendered for non-image attachments
const FILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONCURRENCY = 3;
const CARD_SIZE = 72;
const RING_SIZE = 28;
const RING_STROKE = 2.5;
const RING_R = (RING_SIZE - RING_STROKE * 2) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function makeId(): string {
  return `uk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

function validate(file: File, accept?: string[], maxSize?: number): string | null {
  if (accept && accept.length > 0) {
    const ok = accept.some((p) =>
      p.endsWith('/*') ? file.type.startsWith(p.slice(0, -1)) : file.type === p,
    );
    if (!ok) return 'file type not allowed';
  }
  if (maxSize !== undefined && file.size > maxSize) return `exceeds ${formatBytes(maxSize)}`;
  return null;
}

// ---------------------------------------------------------------------------
// Progress ring — pure SVG so it works without Motion
// ---------------------------------------------------------------------------

function ProgressRing({ progress }: { progress: number }) {
  const offset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      aria-hidden="true"
      style={{ display: 'block', transform: 'rotate(-90deg)' }}
    >
      {/* Track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={RING_STROKE}
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke="var(--uk-primary, #6366f1)"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.2s ease-out' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// AttachButton — dashed card that opens the file picker
// ---------------------------------------------------------------------------

function AttachButton({
  onClick,
  empty,
}: {
  onClick: () => void;
  empty: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      aria-label="Attach files"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: 8,
        border: `1.5px dashed ${hovered ? 'var(--uk-primary, #6366f1)' : 'rgba(255,255,255,0.18)'}`,
        background: hovered
          ? 'rgba(99,102,241,0.08)'
          : 'var(--uk-bg-secondary, rgba(255,255,255,0.04))',
        color: hovered ? 'var(--uk-primary, #6366f1)' : 'var(--uk-text-secondary, #a1a1aa)',
        cursor: 'pointer',
        transition: 'border-color 0.18s ease, background 0.18s ease, color 0.18s ease',
        outline: 'none',
        // Ensure focus is visible for a11y
        boxSizing: 'border-box',
        scrollSnapAlign: 'start',
      }}
      // focus-visible ring
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 0 0 2px var(--uk-primary, #6366f1)';
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      {/* Paperclip icon */}
      <span
        dangerouslySetInnerHTML={{ __html: PAPERCLIP_SVG }}
        style={{ display: 'flex', alignItems: 'center' }}
      />
      {empty && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.01em',
            lineHeight: 1.2,
            textAlign: 'center',
            // Width keeps label from expanding the card
            maxWidth: CARD_SIZE - 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Attach files
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// AttachmentCard — single file card
// ---------------------------------------------------------------------------

function AttachmentCard({
  entry,
  onRemove,
}: {
  entry: FileEntry;
  onRemove: (id: string) => void;
}) {
  const [removeBtnHovered, setRemoveBtnHovered] = useState(false);

  const isImg = isImage(entry.file);
  const showOverlay = entry.status === 'uploading' || entry.status === 'success';
  const overlayOpacity =
    entry.status === 'uploading' ? 1 : entry.status === 'success' ? 0 : 0;

  return (
    <div
      className="uk-attachment-tray__card"
      data-status={entry.status}
      aria-label={`${entry.file.name}${entry.status === 'uploading' ? `, ${entry.progress}%` : entry.status === 'error' ? ', upload failed' : ''}`}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        // Image thumbnail via background-image for native object-fit behaviour
        ...(isImg && entry.thumbnailUrl
          ? {
              backgroundImage: `url(${entry.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {
              background: 'var(--uk-bg-secondary, rgba(255,255,255,0.06))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }),
        border:
          entry.status === 'error'
            ? '1.5px solid var(--uk-error, #ef4444)'
            : '1px solid rgba(255,255,255,0.08)',
        boxSizing: 'border-box',
      }}
    >
      {/* Non-image file icon */}
      {!isImg && entry.status !== 'error' && (
        <span
          dangerouslySetInnerHTML={{ __html: FILE_SVG }}
          style={{
            display: 'flex',
            color: 'var(--uk-text-secondary, #a1a1aa)',
          }}
        />
      )}

      {/* Upload overlay (uploading + success fade-out) */}
      {showOverlay && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            opacity: overlayOpacity,
            transition: 'opacity 0.4s ease',
            borderRadius: 'inherit',
          }}
        >
          {entry.status === 'uploading' && <ProgressRing progress={entry.progress} />}
        </div>
      )}

      {/* Error overlay */}
      {entry.status === 'error' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(239,68,68,0.18)',
            borderRadius: 'inherit',
            color: 'var(--uk-error, #ef4444)',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: ERROR_SVG }} style={{ display: 'flex' }} />
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        aria-label={`Remove ${entry.file.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry.id);
        }}
        onMouseEnter={() => setRemoveBtnHovered(true)}
        onMouseLeave={() => setRemoveBtnHovered(false)}
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: 'none',
          background: removeBtnHovered
            ? 'var(--uk-error, #ef4444)'
            : 'rgba(0,0,0,0.65)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background 0.15s ease',
          outline: 'none',
          zIndex: 2,
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 0 0 2px var(--uk-primary, #6366f1)';
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
        dangerouslySetInnerHTML={{ __html: X_SVG }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const UploadAttachmentTray = forwardRef<HTMLDivElement, UploadAttachmentTrayProps>(
  (
    { route, accept, maxSize, maxFiles, metadata, onUploadComplete, onUploadError, className },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    // Track entries for cleanup across re-renders
    const filesRef = useRef<FileEntry[]>([]);
    filesRef.current = files;

    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Revoke all blob URLs on unmount
    useEffect(() => {
      return () => {
        for (const entry of filesRef.current) {
          if (entry.thumbnailUrl) URL.revokeObjectURL(entry.thumbnailUrl);
        }
      };
    }, []);

    const processFiles = useCallback(
      async (incoming: File[]) => {
        // Respect maxFiles — count already-queued entries
        const remaining =
          maxFiles !== undefined ? maxFiles - filesRef.current.length : Infinity;
        const trimmed = incoming.slice(0, Math.max(0, remaining));
        if (trimmed.length === 0) return;

        const accepted: FileEntry[] = [];
        for (const f of trimmed) {
          const reason = validate(f, accept, maxSize);
          if (reason) {
            onUploadError?.(new Error(`${f.name} — ${reason}`));
          } else {
            const thumbnailUrl = isImage(f) ? URL.createObjectURL(f) : undefined;
            accepted.push({
              id: makeId(),
              file: f,
              status: 'idle',
              progress: 0,
              ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
            });
          }
        }
        if (accepted.length === 0) return;

        setFiles((prev) => [...prev, ...accepted]);

        // Upload with controlled concurrency (CONCURRENCY = 3 at a time)
        const results: UploadResult[] = [];
        const queue = [...accepted];

        async function runOne(entry: FileEntry) {
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
                setFiles((prev) =>
                  prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
                ),
              signal: ctrl.signal,
            });
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id ? { ...f, status: 'success', progress: 100 } : f,
              ),
            );
            results.push(r);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.name !== 'AbortError') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === entry.id ? { ...f, status: 'error', error: error.message } : f,
                ),
              );
              onUploadError?.(error);
            }
          }
        }

        // Slice queue into concurrent batches of CONCURRENCY
        for (let i = 0; i < queue.length; i += CONCURRENCY) {
          await Promise.all(queue.slice(i, i + CONCURRENCY).map(runOne));
        }

        if (results.length > 0) onUploadComplete?.(results);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [client, route, accept, maxSize, maxFiles, onUploadError, onUploadComplete],
    );

    function removeEntry(id: string) {
      setFiles((prev) => {
        const entry = prev.find((f) => f.id === id);
        // Abort any in-flight upload
        entry?.abort?.abort();
        // Revoke blob URL immediately to free memory
        if (entry?.thumbnailUrl) URL.revokeObjectURL(entry.thumbnailUrl);
        return prev.filter((f) => f.id !== id);
      });
    }

    function openPicker() {
      inputRef.current?.click();
    }

    const hasFiles = files.length > 0;

    // ------------------------------------------------------------------
    // Card wrapper — animated or static depending on Motion availability
    // ------------------------------------------------------------------

    function CardWrapper({
      entry,
      children,
    }: {
      entry: FileEntry;
      children: React.ReactNode;
    }) {
      if (animated) {
        const Div = m!.motion.div;
        return (
          <Div
            key={entry.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ flexShrink: 0 }}
          >
            {children}
          </Div>
        );
      }
      return <>{children}</>;
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    return (
      <div
        ref={ref}
        className={mergeClass('uk-attachment-tray', className)}
        data-uk-element="attachment-tray"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: 0,
        }}
      >
        {/* Tray scroll area — visible only when there are files */}
        <div
          className="uk-attachment-tray__scroll"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: hasFiles ? '8px 0 4px' : '0',
            scrollSnapType: 'x mandatory',
            // Thin custom scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor:
              'rgba(255,255,255,0.15) transparent',
          }}
          // Webkit scrollbar: thin and styled
          // (applied via a style tag trick — but since this is inline-style only
          // we annotate it; browsers that support scrollbarWidth=thin are enough)
        >
          {/* Attach button — always first in the tray row */}
          <AttachButton onClick={openPicker} empty={!hasFiles} />

          {/* File cards */}
          {animated ? (
            <m.AnimatePresence initial={false}>
              {files.map((entry) => (
                <CardWrapper key={entry.id} entry={entry}>
                  <AttachmentCard entry={entry} onRemove={removeEntry} />
                </CardWrapper>
              ))}
            </m.AnimatePresence>
          ) : (
            files.map((entry) => (
              <AttachmentCard key={entry.id} entry={entry} onRemove={removeEntry} />
            ))
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={maxFiles !== 1}
          accept={accept?.join(',')}
          onChange={(e) => {
            const sel = Array.from(e.target.files ?? []);
            if (sel.length > 0) void processFiles(sel);
            // Reset so same file can be re-selected after removal
            e.target.value = '';
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadAttachmentTray.displayName = 'UploadAttachmentTray';
