import { forwardRef, useRef, useCallback, useState } from 'react';
import type { UploadResult } from '@uploadkit/core';
import { useUploadKitContext } from '../context';
import { useDragState } from '../hooks/use-drag-state';
import { useAutoDismiss } from '../hooks/use-auto-dismiss';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { getUploadIcon } from '../utils/file-icons';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// exactOptionalPropertyTypes: true — optional fields must be declared as T | undefined
// so they can be explicitly set to undefined when clearing them.
type FileEntry = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  result?: UploadResult | undefined;
  error?: Error | undefined;
  abortController?: AbortController | undefined;
};

type RejectionEntry = {
  id: string;
  message: string;
};

export type UploadDropzoneProps = {
  /** Route name defined in your fileRouter */
  route: string;
  /** Accepted MIME types (UX validation only — server enforces authoritative check) */
  accept?: string[];
  /** Maximum file size in bytes (UX validation only) */
  maxSize?: number;
  /** Maximum number of files per drop/selection */
  maxFiles?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Called after all accepted files finish uploading successfully */
  onUploadComplete?: (results: UploadResult[]) => void;
  /** Called when any individual upload fails */
  onUploadError?: (error: Error) => void;
  /** Disable the dropzone */
  disabled?: boolean;
  /** Additional CSS class(es) for the wrapper */
  className?: string;
  /** Override specific inner element classes */
  appearance?: Partial<
    Record<'container' | 'label' | 'icon' | 'fileItem' | 'progressBar' | 'button', string>
  >;
};

// Small inline SVG icons for file item status indicators
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

let _id = 0;
function nextId() {
  return `uk-${++_id}`;
}

/**
 * UploadDropzone — drag-and-drop zone with multi-file support,
 * per-file progress bars, and auto-dismissing error toasts.
 *
 * Architecture:
 *  - Uses raw client.upload() (not useUploadKit) to manage multiple files independently.
 *  - useDragState counter technique prevents flickering on child element drag events.
 *  - useAutoDismiss removes rejection toasts after 5s.
 *  - Uploads run in parallel batches of up to 3 (T-05-05 DoS mitigation).
 *
 * Accessibility (REACT-10/REACT-11): role=button, tabIndex, onKeyDown, aria-label.
 */
export const UploadDropzone = forwardRef<HTMLDivElement, UploadDropzoneProps>(
  (
    {
      route,
      accept,
      maxSize,
      maxFiles,
      metadata,
      onUploadComplete,
      onUploadError,
      disabled = false,
      className,
      appearance,
    },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [rejections, addRejection, removeRejection] = useAutoDismiss<RejectionEntry>(5000);

    // Validates a single file against accept / maxSize rules.
    // Returns an error string if rejected, null if accepted.
    function validateFile(file: File): string | null {
      if (accept && accept.length > 0) {
        const fileType = file.type;
        const allowed = accept.some((pattern) => {
          if (pattern.endsWith('/*')) {
            return fileType.startsWith(pattern.slice(0, -1));
          }
          return fileType === pattern;
        });
        if (!allowed) {
          const ext = file.name.split('.').pop() ?? file.type;
          return `.${ext} files not allowed`;
        }
      }

      if (maxSize !== undefined && file.size > maxSize) {
        return `exceeds ${formatBytes(maxSize)} limit`;
      }

      return null;
    }

    // Upload a single file entry, updating its state as it progresses.
    const uploadFile = useCallback(
      async (entry: FileEntry) => {
        const controller = new AbortController();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'uploading', abortController: controller }
              : f,
          ),
        );

        try {
          const result = await client.upload({
            file: entry.file,
            route,
            ...(metadata !== undefined ? { metadata } : {}),
            onProgress: (percent) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
              );
            },
            signal: controller.signal,
          });

          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'success', progress: 100, result, abortController: undefined }
                : f,
            ),
          );

          return result;
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error(String(err));

          if (error.name !== 'AbortError') {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, status: 'error', progress: 0, error, abortController: undefined }
                  : f,
              ),
            );
            onUploadError?.(error);
          } else {
            // Aborted — reset file to idle
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, status: 'idle', progress: 0, abortController: undefined }
                  : f,
              ),
            );
          }

          return null;
        }
      },
      [client, route, metadata, onUploadError],
    );

    // Processes incoming files: validate, reject, enqueue, upload in batches of 3.
    const processFiles = useCallback(
      async (incoming: File[]) => {
        if (disabled) return;

        // Apply maxFiles limit
        const toProcess =
          maxFiles !== undefined ? incoming.slice(0, maxFiles) : incoming;

        const accepted: FileEntry[] = [];

        for (const file of toProcess) {
          const rejectionReason = validateFile(file);
          if (rejectionReason) {
            addRejection({ id: nextId(), message: `${file.name} rejected — ${rejectionReason}` });
          } else {
            accepted.push({ id: nextId(), file, status: 'idle', progress: 0 });
          }
        }

        if (accepted.length === 0) return;

        setFiles((prev) => [...prev, ...accepted]);

        // Upload in parallel batches of 3 (T-05-05: limit concurrent connections)
        const CONCURRENCY = 3;
        const results: UploadResult[] = [];

        for (let i = 0; i < accepted.length; i += CONCURRENCY) {
          const batch = accepted.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(batch.map((entry) => uploadFile(entry)));
          for (const r of batchResults) {
            if (r !== null) results.push(r);
          }
        }

        if (results.length > 0 && results.length === accepted.length) {
          onUploadComplete?.(results);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [disabled, maxFiles, accept, maxSize, addRejection, uploadFile, onUploadComplete],
    );

    const { isDragging, handlers: dragHandlers } = useDragState(processFiles);

    function handleClick() {
      if (disabled) return;
      inputRef.current?.click();
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) {
        void processFiles(selected);
      }
      // Reset so the same selection can be made again
      e.target.value = '';
    }

    function removeFile(id: string) {
      setFiles((prev) => {
        const entry = prev.find((f) => f.id === id);
        entry?.abortController?.abort();
        return prev.filter((f) => f.id !== id);
      });
    }

    const dropzoneClass = mergeClass('uk-dropzone', appearance?.container);

    return (
      <div>
        {/* Drag-and-drop zone */}
        <div
          ref={ref}
          className={mergeClass(dropzoneClass, className)}
          data-dragging={isDragging ? 'true' : 'false'}
          {...dragHandlers}
          onClick={handleClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Drop files here or click to browse"
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <div
            className={mergeClass('uk-dropzone__icon', appearance?.icon)}
            dangerouslySetInnerHTML={{ __html: getUploadIcon() }}
          />
          <p className={mergeClass('uk-dropzone__label', appearance?.label)}>
            <strong>Drop files here</strong> or click to browse
          </p>
          {accept && accept.length > 0 && (
            <p className="uk-dropzone__hint" style={{ fontSize: '12px', color: 'var(--uk-text-secondary)', marginTop: '4px' }}>
              {accept.join(', ')}
            </p>
          )}
        </div>

        {/* Rejection error toasts (auto-dismiss after 5s) */}
        {rejections.map((r) => (
          <div
            key={r.id}
            className="uk-error-toast"
            role="alert"
            aria-live="polite"
          >
            <span>{r.message}</span>
            <button
              type="button"
              onClick={() => removeRejection(r.id)}
              aria-label="Dismiss error"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: '8px', padding: '0' }}
            >
              {/* inline dismiss X */}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}

        {/* Queued file list */}
        {files.length > 0 && (
          <div className="uk-file-list" style={{ marginTop: '12px' }}>
            {files.map((f) => (
              <div
                key={f.id}
                className={mergeClass('uk-file-item', appearance?.fileItem)}
              >
                <span className="uk-file-item__name" title={f.file.name}>
                  {f.file.name}
                </span>
                <span className="uk-file-item__size">{formatBytes(f.file.size)}</span>

                {f.status === 'uploading' && (
                  <div
                    className={mergeClass('uk-progress', appearance?.progressBar)}
                    style={{ flex: '1', minWidth: '60px' }}
                  >
                    <div
                      className="uk-progress__bar"
                      style={{ width: `${f.progress}%` }}
                      role="progressbar"
                      aria-valuenow={f.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Uploading ${f.file.name}: ${f.progress}%`}
                    />
                  </div>
                )}

                {f.status === 'success' && (
                  <span
                    style={{ color: 'var(--uk-success)', display: 'flex', alignItems: 'center' }}
                    aria-label="Upload complete"
                    dangerouslySetInnerHTML={{ __html: CHECK_SVG }}
                  />
                )}

                {f.status === 'error' && (
                  <span
                    className="uk-file-item__error"
                    style={{ color: 'var(--uk-error)', display: 'flex', alignItems: 'center' }}
                    aria-label="Upload failed"
                    title={f.error?.message}
                    dangerouslySetInnerHTML={{ __html: X_SVG }}
                  />
                )}

                {(f.status === 'idle' || f.status === 'uploading') && (
                  <button
                    type="button"
                    className="uk-file-item__remove"
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for click-to-browse */}
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          hidden
          accept={accept?.join(',')}
          onChange={handleInputChange}
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
        />
      </div>
    );
  },
);

UploadDropzone.displayName = 'UploadDropzone';
