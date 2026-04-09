import { useRef } from 'react';
import type { UploadResult } from '@uploadkit/core';
import { useThumbnail } from '../hooks/use-thumbnail';
import { mergeClass } from '../utils/merge-class';
import { getFileTypeIcon } from '../utils/file-icons';

export type FilePreviewProps = {
  /** A pre-upload File object or a completed UploadResult */
  file: File | UploadResult;
  /** Additional CSS class(es) for the container */
  className?: string;
  /** Override specific inner element classes */
  appearance?: Partial<Record<'container' | 'image' | 'icon', string>>;
};

/**
 * Returns true if the value is an UploadResult (has a `url` property).
 */
function isUploadResult(file: File | UploadResult): file is UploadResult {
  return 'url' in file;
}

/**
 * FilePreview — renders a 48×48 thumbnail for a file.
 *
 * Architecture:
 *  - UploadResult with url → renders <img src={url}> directly (server-trusted URL).
 *  - File (image) → useThumbnail generates a blob URL via createObjectURL.
 *  - File (video) → useThumbnail captures first frame via canvas drawImage.
 *  - File (other) → renders type-specific SVG icon via getFileTypeIcon.
 *  - IntersectionObserver inside useThumbnail defers generation until visible (T-05-08).
 *
 * Accessibility: img has alt text from file name; icon container is aria-hidden.
 */
export function FilePreview({ file, className, appearance }: FilePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // For UploadResult: use the server URL directly (no thumbnail generation needed)
  if (isUploadResult(file)) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    return (
      <div
        className={mergeClass('uk-preview', mergeClass(appearance?.container ?? '', className ?? ''))}
        data-uk-element="preview"
      >
        {isImage || isVideo ? (
          <img
            src={file.url}
            alt={file.name}
            className={mergeClass('uk-preview__img', appearance?.image)}
            data-uk-element="preview-image"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          />
        ) : (
          <div
            className={mergeClass('uk-preview--icon', appearance?.icon)}
            data-uk-element="preview-icon"
            style={{ color: 'var(--uk-text-secondary)' }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: getFileTypeIcon(file.type) }}
          />
        )}
      </div>
    );
  }

  // For File objects: use useThumbnail hook with IntersectionObserver
  return (
    <FilePreviewFromFile
      file={file}
      containerRef={containerRef}
      {...(className !== undefined ? { className } : {})}
      {...(appearance !== undefined ? { appearance } : {})}
    />
  );
}

/**
 * Inner component for File objects — separated so hooks run unconditionally.
 */
function FilePreviewFromFile({
  file,
  containerRef,
  className,
  appearance,
}: {
  file: File;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  appearance?: Partial<Record<'container' | 'image' | 'icon', string>>;
}) {
  const { thumbnailUrl, isGenerating } = useThumbnail(file, containerRef);

  return (
    <div
      ref={containerRef}
      className={mergeClass('uk-preview', mergeClass(appearance?.container ?? '', className ?? ''))}
      data-uk-element="preview"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={file.name}
          className={mergeClass('uk-preview__img', appearance?.image)}
          data-uk-element="preview-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      ) : isGenerating ? (
        /* Skeleton placeholder while generating video thumbnail */
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--uk-border)',
            borderRadius: 'inherit',
            animation: 'uk-fade-in 300ms ease-out',
          }}
          aria-hidden="true"
        />
      ) : (
        /* Non-image/video: type-specific icon */
        <div
          className={mergeClass('uk-preview--icon', appearance?.icon)}
          data-uk-element="preview-icon"
          style={{ color: 'var(--uk-text-secondary)' }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getFileTypeIcon(file.type) }}
        />
      )}
    </div>
  );
}
