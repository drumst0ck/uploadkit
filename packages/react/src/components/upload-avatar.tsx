// UploadAvatar — circular crop + blur-up preview + SVG progress ring (Motion
// pathLength when available). Inspired by Linear, Notion and Apple ID flows.

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadAvatarProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  initialSrc?: string;
  size?: number;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

const PLACEHOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

export const UploadAvatar = forwardRef<HTMLDivElement, UploadAvatarProps>(
  (
    { route, accept = ['image/*'], maxSize, metadata, initialSrc, size = 96, onUploadComplete, onUploadError, className },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialSrc);
    const [imgLoaded, setImgLoaded] = useState(false);
    const objectUrlRef = useRef<string | null>(null);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    useEffect(() => {
      if (status === 'success' && result) {
        if (typeof (result as { url?: unknown }).url === 'string') {
          setPreviewUrl((result as { url: string }).url);
          setImgLoaded(false);
        }
        onUploadComplete?.(result);
      }
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) onUploadError?.(error);
    }, [status, error, onUploadError]);

    useEffect(() => {
      return () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      };
    }, []);

    function openPicker() {
      inputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (maxSize !== undefined && file.size > maxSize) {
        onUploadError?.(new Error(`File exceeds the ${maxSize} byte limit.`));
        return;
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      setImgLoaded(false);

      await upload(file, metadata);
    }

    // Ring geometry
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress / 100);
    const showRing = isUploading || (progress > 0 && progress < 100);

    const MotionCircle = animated && m ? m.motion.circle : null;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-avatar', className)}
        data-uk-element="container"
        data-state={status}
        role="button"
        tabIndex={0}
        aria-label="Change avatar"
        aria-busy={isUploading}
        style={{ width: size, height: size }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        {previewUrl ? (
          <img
            className="uk-avatar__img"
            src={previewUrl}
            alt=""
            onLoad={() => setImgLoaded(true)}
            style={{ filter: imgLoaded ? 'blur(0)' : 'blur(8px)' }}
          />
        ) : (
          <div className="uk-avatar__placeholder" dangerouslySetInnerHTML={{ __html: PLACEHOLDER_ICON }} />
        )}

        {showRing && (
          <svg
            className="uk-avatar__ring"
            viewBox="0 0 96 96"
            aria-hidden="true"
            role="presentation"
          >
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={3}
            />
            {MotionCircle ? (
              <MotionCircle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="var(--uk-primary)"
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                animate={{ pathLength: progress / 100 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              />
            ) : (
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="var(--uk-primary)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            )}
          </svg>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept.join(',')}
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadAvatar.displayName = 'UploadAvatar';
