'use client';

import * as React from 'react';
import { formatBytes } from '../../lib/format';
import type { FileRecord } from '../../hooks/use-files';
import { fileKind } from './file-kind';

interface FilePreviewDialogProps {
  file: FileRecord | null;
  onClose: () => void;
  onCopy: (file: FileRecord) => void;
  copied: boolean;
  /** Element that opened the dialog; focus goes back to it on close. */
  opener: HTMLElement | null;
}

/** Native <dialog> that shows the real image from its CDN URL. Escape and backdrop click close it. */
export function FilePreviewDialog({ file, onClose, onCopy, copied, opener }: FilePreviewDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [dims, setDims] = React.useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (file && !dialog.open) {
      setDims(null);
      setFailed(false);
      dialog.showModal();
    }
    if (!file && dialog.open) dialog.close();
  }, [file]);

  const close = React.useCallback(() => {
    const dialog = ref.current;
    if (dialog?.open) dialog.close();
    onClose();
    // The native dialog restores focus itself; do it explicitly too for rows that re-rendered.
    window.setTimeout(() => opener?.focus(), 0);
  }, [onClose, opener]);

  return (
    <dialog
      ref={ref}
      className="pd-dialog"
      style={{ margin: 'auto', width: 'min(56rem, calc(100vw - 2rem))', maxHeight: 'calc(100dvh - 2rem)', overflow: 'auto' }}
      aria-labelledby="file-preview-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) close();
      }}
    >
      {file ? (
        <>
          <h2 id="file-preview-title" className="font-mono break-all">{file.name}</h2>
          <div
            className="mb-4 grid min-h-[14rem] place-items-center overflow-hidden rounded-md"
            style={{ background: 'var(--pd-color-bg-canvas)' }}
          >
            {failed ? (
              <p className="p-6 text-sm" style={{ color: 'var(--pd-color-text-secondary)', margin: 0 }}>
                The image could not be loaded from its URL.
              </p>
            ) : (
              <img
                src={file.url}
                alt={file.name}
                className="max-h-[22rem] max-w-full object-contain"
                onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setFailed(true)}
              />
            )}
          </div>
          <dl className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--pd-color-text-secondary)' }}>
            <div><dt className="sr-only">Type</dt><dd className="m-0" style={{ color: 'var(--pd-color-text-primary)' }}>{fileKind(file.type)} <span className="font-mono">({file.type})</span></dd></div>
            <div><dt className="sr-only">Size</dt><dd className="m-0">{formatBytes(file.size)}</dd></div>
            {dims ? <div><dt className="sr-only">Dimensions</dt><dd className="m-0">{dims.w} × {dims.h} px</dd></div> : null}
            <div className="min-w-0 basis-full"><dt className="sr-only">CDN URL</dt><dd className="m-0 break-all font-mono" style={{ color: 'var(--pd-color-text-primary)' }}>{file.url}</dd></div>
          </dl>
          <div className="pd-dialog-actions flex-wrap">
            <a
              className="pd-button pd-button--ghost"
              style={{ minHeight: '2rem', textDecoration: 'none' }}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <button type="button" className="pd-button pd-button--secondary" style={{ minHeight: '2rem' }} onClick={() => onCopy(file)}>
              {copied ? 'Copied' : 'Copy URL'}
            </button>
            <button type="button" className="pd-button pd-button--secondary" style={{ minHeight: '2rem' }} onClick={close} autoFocus>
              Close
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
