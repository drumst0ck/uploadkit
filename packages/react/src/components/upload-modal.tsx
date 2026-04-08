import { useRef, useEffect } from 'react';
import type { UploadResult } from '@uploadkit/core';
import { mergeClass } from '../utils/merge-class';
import { UploadDropzone } from './upload-dropzone';

export type UploadModalProps = {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (ESC, backdrop click) */
  onClose: () => void;
  /** Route name defined in your fileRouter */
  route: string;
  /** Accepted MIME types (UX validation only — server enforces authoritative check) */
  accept?: string[];
  /** Maximum file size in bytes (UX validation only) */
  maxSize?: number;
  /** Maximum number of files per upload */
  maxFiles?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Called after all accepted files finish uploading successfully */
  onUploadComplete?: (results: UploadResult[]) => void;
  /** Called when any individual upload fails */
  onUploadError?: (error: Error) => void;
  /** Additional CSS class(es) for the modal */
  className?: string;
  /** Override specific inner element classes */
  appearance?: Partial<
    Record<
      'modal' | 'backdrop' | 'content' | 'container' | 'label' | 'icon' | 'fileItem' | 'progressBar' | 'button',
      string
    >
  >;
  /** Modal heading text */
  title?: string;
};

/**
 * UploadModal — modal overlay for file uploads using the native <dialog> element.
 *
 * Architecture:
 *  - Uses native HTMLDialogElement.showModal() / .close() imperative API.
 *  - Native dialog provides built-in focus trap, ::backdrop, and aria-modal semantics.
 *  - ESC key is handled via onCancel (with preventDefault) so React state drives close.
 *  - Click-outside detection compares e.target to the dialog element itself (backdrop click).
 *  - Modal animation is handled entirely by CSS (uk-modal-enter keyframe in styles.css).
 *  - Composes UploadDropzone inside — no upload logic duplication.
 *
 * Accessibility (REACT-05): native <dialog> provides role="dialog", aria-modal, focus trap.
 */
export function UploadModal({
  open,
  onClose,
  route,
  accept,
  maxSize,
  maxFiles,
  metadata,
  onUploadComplete,
  onUploadError,
  className,
  appearance,
  title,
}: UploadModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Prevent native ESC close — let React state drive via onClose()
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  // Detect click on backdrop: e.target is the dialog element itself (not its content)
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={mergeClass('uk-modal', mergeClass(appearance?.modal ?? '', className))}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-label={title ?? 'Upload files'}
    >
      <div className={mergeClass('uk-modal__content', appearance?.content)}>
        {title && <h2 className="uk-modal__title">{title}</h2>}
        <UploadDropzone
          route={route}
          {...(accept !== undefined ? { accept } : {})}
          {...(maxSize !== undefined ? { maxSize } : {})}
          {...(maxFiles !== undefined ? { maxFiles } : {})}
          {...(metadata !== undefined ? { metadata } : {})}
          {...(onUploadComplete !== undefined ? { onUploadComplete } : {})}
          {...(onUploadError !== undefined ? { onUploadError } : {})}
          appearance={{
            ...(appearance?.container !== undefined ? { container: appearance.container } : {}),
            ...(appearance?.label !== undefined ? { label: appearance.label } : {}),
            ...(appearance?.icon !== undefined ? { icon: appearance.icon } : {}),
            ...(appearance?.fileItem !== undefined ? { fileItem: appearance.fileItem } : {}),
            ...(appearance?.progressBar !== undefined ? { progressBar: appearance.progressBar } : {}),
            ...(appearance?.button !== undefined ? { button: appearance.button } : {}),
          }}
        />
      </div>
    </dialog>
  );
}
