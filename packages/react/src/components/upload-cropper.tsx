import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';

export type UploadCropperProps = {
  route: string;
  aspectRatio?: number;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  appearance?: Partial<Record<'container' | 'canvas' | 'controls' | 'button', string>>;
};

export const UploadCropper = forwardRef<HTMLDivElement, UploadCropperProps>(
  function UploadCropper(
    {
      route,
      aspectRatio = 1,
      accept = ['image/jpeg', 'image/png', 'image/webp'],
      maxSize,
      metadata,
      onUploadComplete,
      onUploadError,
      className,
      appearance,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [source, setSource] = useState<HTMLImageElement | null>(null);
    const [cropSize, setCropSize] = useState(200);
    const { upload, isUploading, result, status } = useUploadKit(route);

    useEffect(() => {
      if (status === 'success' && result) {
        onUploadComplete?.(result);
      }
    }, [status, result, onUploadComplete]);

    const drawPreview = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !source) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const outW = 400;
      const outH = Math.round(outW / aspectRatio);
      canvas.width = outW;
      canvas.height = outH;

      const cropH = cropSize / aspectRatio;
      const x = (source.width - cropSize) / 2;
      const y = (source.height - cropH) / 2;

      ctx.clearRect(0, 0, outW, outH);
      ctx.drawImage(source, x, y, cropSize, cropH, 0, 0, outW, outH);
    }, [source, cropSize, aspectRatio]);

    useEffect(() => {
      drawPreview();
    }, [drawPreview]);

    const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        setSource(img);
        setCropSize(Math.min(img.width, img.height * aspectRatio));
      };
      img.src = URL.createObjectURL(file);
    }, [aspectRatio]);

    const handleUpload = async () => {
      const canvas = canvasRef.current;
      if (!canvas || isUploading) return;

      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.92),
        );
        if (!blob) throw new Error('Failed to crop image');
        if (maxSize && blob.size > maxSize) {
          throw new Error(`Cropped file exceeds max size (${maxSize} bytes)`);
        }

        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        await upload(file, metadata);
      } catch (err) {
        onUploadError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    return (
      <div ref={ref} className={mergeClass('uk-cropper', className, appearance?.container)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          onChange={onFileChange}
          className="uk-sr-only"
          aria-label="Choose image to crop"
        />

        {!source ? (
          <button
            type="button"
            className={mergeClass('uk-button', appearance?.button)}
            onClick={() => inputRef.current?.click()}
          >
            Choose image
          </button>
        ) : (
          <div className={mergeClass('uk-cropper__controls', appearance?.controls)}>
            <canvas
              ref={canvasRef}
              className={mergeClass('uk-cropper__canvas', appearance?.canvas)}
              aria-label="Crop preview"
            />
            <label className="uk-cropper__slider-label">
              Crop size
              <input
                type="range"
                min={32}
                max={Math.min(source.width, source.height * aspectRatio)}
                value={cropSize}
                onChange={(e) => setCropSize(Number(e.target.value))}
              />
            </label>
            <div className="uk-cropper__actions">
              <button
                type="button"
                className="uk-button uk-button--ghost"
                onClick={() => {
                  setSource(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className={mergeClass('uk-button', appearance?.button)}
                disabled={isUploading}
                aria-busy={isUploading}
                onClick={() => { void handleUpload(); }}
              >
                {isUploading ? 'Uploading…' : 'Upload cropped'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

UploadCropper.displayName = 'UploadCropper';
