import type { UploadResult } from '@uploadkit/core';
import { FilePreview } from './file-preview';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';

export type FileListProps = {
  /** Array of completed upload results to display */
  files: UploadResult[];
  /** Called with the file key when the delete button is clicked */
  onDelete?: (fileKey: string) => void;
  /** Additional CSS class(es) for the list wrapper */
  className?: string;
  /** Override specific inner element classes */
  appearance?: Partial<
    Record<'list' | 'item' | 'preview' | 'name' | 'size' | 'deleteButton', string>
  >;
};

// X icon SVG for the delete button
const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * FileList — displays a list of uploaded files with previews and delete actions.
 *
 * Architecture:
 *  - Maps over UploadResult[] — each item shows FilePreview thumbnail, name, size, type.
 *  - onDelete is optional; delete button is hidden when not provided.
 *  - FilePreview renders server URL directly for UploadResult objects.
 *  - Accessible: delete button has aria-label, file name has title for overflow tooltip.
 *
 * Usage: intended for displaying files after upload is complete.
 */
export function FileList({ files, onDelete, className, appearance }: FileListProps) {
  return (
    <div className={mergeClass('uk-file-list', mergeClass(appearance?.list ?? '', className ?? ''))}>
      {files.length === 0 ? (
        <p className="uk-file-list__empty" style={{ fontSize: '13px', color: 'var(--uk-text-secondary)', fontFamily: 'var(--uk-font)', margin: 0 }}>
          No files uploaded
        </p>
      ) : (
        files.map((file) => (
          <div key={file.key} className={mergeClass('uk-file-item', appearance?.item)}>
            <FilePreview
              file={file}
              appearance={{
                ...(appearance?.preview !== undefined ? { container: appearance.preview } : {}),
              }}
            />
            <div className="uk-file-item__info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                className={mergeClass('uk-file-item__name', appearance?.name)}
                title={file.name}
              >
                {file.name}
              </span>
              <span className={mergeClass('uk-file-item__size', appearance?.size)}>
                {formatBytes(file.size)}
              </span>
            </div>
            {onDelete && (
              <button
                type="button"
                className={mergeClass('uk-file-item__remove', appearance?.deleteButton)}
                onClick={() => onDelete(file.key)}
                aria-label={`Delete ${file.name}`}
                dangerouslySetInnerHTML={{ __html: DELETE_ICON }}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}
