// UploadButtonMagnetic — inspired by Apple product pages. Cursor-attraction
// via Motion spring. Falls back to a CSS hover scale when motion is missing.

import { forwardRef, useEffect, useRef } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import {
  useOptionalMotion,
  useReducedMotionSafe,
  type MotionModule,
} from '../utils/motion-optional';
import { UploadBeam } from './upload-beam';
import type { UploadBeamState } from './upload-beam';

export type UploadButtonMagneticProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Wrap with an animated border beam that reflects upload state. */
  beam?: boolean;
};

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;

type SharedHandlers = {
  onClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

type SharedState = {
  status: string;
  progress: number;
  isUploading: boolean;
  disabled: boolean;
  label: React.ReactNode;
  className?: string;
  accept?: string[];
};

/**
 * Inner animated button — only mounted once Motion is confirmed available.
 * Splitting this out keeps the hook call order stable in the parent
 * (React would otherwise reject the conditional `useMotionValue` calls).
 */
function MagneticAnimated(
  props: SharedState &
    SharedHandlers & {
      m: MotionModule;
      forwardedRef: React.Ref<HTMLButtonElement>;
      inputRef: React.RefObject<HTMLInputElement | null>;
    },
) {
  const { m, forwardedRef, inputRef, status, progress, isUploading, disabled, label, className, accept, onClick, onFileChange } = props;
  const x = m.useMotionValue(0);
  const y = m.useMotionValue(0);
  const sx = m.useSpring(x, { stiffness: 150, damping: 15 });
  const sy = m.useSpring(y, { stiffness: 150, damping: 15 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.4);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.4);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const MotionButton = m.motion.button;
  return (
    <>
      <MotionButton
        ref={forwardedRef}
        type="button"
        className={mergeClass('uk-btn-magnetic', className)}
        data-uk-element="button"
        data-state={status}
        disabled={disabled || isUploading}
        aria-busy={isUploading}
        aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
        style={{ x: sx, y: sy }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: ICON }} />
        <span>{label}</span>
      </MotionButton>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept?.join(',')}
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </>
  );
}

function MagneticStatic(
  props: SharedState &
    SharedHandlers & {
      forwardedRef: React.Ref<HTMLButtonElement>;
      inputRef: React.RefObject<HTMLInputElement | null>;
    },
) {
  const { forwardedRef, inputRef, status, progress, isUploading, disabled, label, className, accept, onClick, onFileChange } = props;
  return (
    <>
      <button
        ref={forwardedRef}
        type="button"
        className={mergeClass('uk-btn-magnetic', className)}
        data-uk-element="button"
        data-state={status}
        disabled={disabled || isUploading}
        aria-busy={isUploading}
        aria-label={isUploading ? `Uploading ${progress}%` : 'Upload file'}
        onClick={onClick}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: ICON }} />
        <span>{label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept?.join(',')}
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </>
  );
}

export const UploadButtonMagnetic = forwardRef<HTMLButtonElement, UploadButtonMagneticProps>(
  (
    { route, accept, maxSize, metadata, onUploadComplete, onUploadError, disabled = false, className, children, beam },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, status, progress, result, error, isUploading } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    useEffect(() => {
      if (status === 'success' && result) onUploadComplete?.(result);
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) onUploadError?.(error);
    }, [status, error, onUploadError]);

    function handleClick() {
      if (disabled || isUploading) return;
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
      await upload(file, metadata);
    }

    const label = isUploading ? `Uploading ${progress}%` : (children ?? 'Upload file');

    // Map internal status to UploadBeamState
    const beamState: UploadBeamState =
      status === 'uploading' ? 'uploading'
      : status === 'success' ? 'complete'
      : status === 'error' ? 'error'
      : 'idle';

    const shared: SharedState & SharedHandlers = {
      status,
      progress,
      isUploading,
      disabled,
      label,
      ...(className !== undefined ? { className } : {}),
      ...(accept !== undefined ? { accept } : {}),
      onClick: handleClick,
      onFileChange: handleFileChange,
    };

    const content = animated && m
      ? <MagneticAnimated {...shared} m={m} forwardedRef={ref} inputRef={inputRef} />
      : <MagneticStatic {...shared} forwardedRef={ref} inputRef={inputRef} />;

    if (beam) {
      return <UploadBeam state={beamState}>{content}</UploadBeam>;
    }

    return content;
  },
);

UploadButtonMagnetic.displayName = 'UploadButtonMagnetic';
