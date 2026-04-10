// UploadStepWizard — 5-stage single-file upload wizard (select → preview →
// confirm → upload → done). Panels slide with AnimatePresence when Motion is
// available, otherwise a CSS keyframe handles the enter animation. Inspired
// by Stripe Checkout and the Apple Pay add-card sheet.

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKit } from '../use-upload-kit';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

export type UploadStepWizardProps = {
  route: string;
  accept?: string[];
  maxSize?: number;
  metadata?: Record<string, unknown>;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
};

type Stage = 'select' | 'preview' | 'confirm' | 'upload' | 'done';

const STAGES: Stage[] = ['select', 'preview', 'confirm', 'upload', 'done'];

const CHECK_ICON = (
  <svg
    viewBox="0 0 24 24"
    width={28}
    height={28}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const UploadStepWizard = forwardRef<HTMLDivElement, UploadStepWizardProps>(
  (
    { route, accept, maxSize, metadata, onUploadComplete, onUploadError, className },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [stage, setStage] = useState<Stage>('select');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { upload, status, progress, result, error } = useUploadKit(route);
    const m = useOptionalMotion();
    const reduced = useReducedMotionSafe();
    const animated = m !== null && !reduced;

    // Drive stage from upload status.
    useEffect(() => {
      if (status === 'success' && result) {
        setStage('done');
        onUploadComplete?.(result);
      }
    }, [status, result, onUploadComplete]);

    useEffect(() => {
      if (status === 'error' && error) {
        onUploadError?.(error);
      }
    }, [status, error, onUploadError]);

    // Revoke object URL on unmount.
    useEffect(() => {
      return () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      };
    }, []);

    function resetFile() {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setFile(null);
      setPreviewUrl(null);
    }

    function openPicker() {
      inputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const next = e.target.files?.[0];
      e.target.value = '';
      if (!next) return;
      if (maxSize !== undefined && next.size > maxSize) {
        onUploadError?.(new Error(`File exceeds the ${maxSize} byte limit.`));
        return;
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = next.type.startsWith('image/') ? URL.createObjectURL(next) : null;
      if (url) objectUrlRef.current = url;
      setFile(next);
      setPreviewUrl(url);
      setStage('preview');
    }

    async function startUpload() {
      if (!file) return;
      setStage('upload');
      await upload(file, metadata);
    }

    function restart() {
      resetFile();
      setStage('select');
    }

    const MotionDiv = animated && m ? m.motion.div : null;
    const AnimatePresence = animated && m ? m.AnimatePresence : null;

    const currentIndex = STAGES.indexOf(stage);

    const renderPanel = () => {
      if (stage === 'select') {
        return (
          <div key="select" className="uk-step-wizard__panel">
            <h3 className="uk-step-wizard__title">Pick a file</h3>
            <p className="uk-step-wizard__sub">Start by selecting something to upload.</p>
            <div className="uk-step-wizard__actions">
              <button
                type="button"
                className="uk-step-wizard__button"
                data-variant="primary"
                onClick={openPicker}
              >
                Select file
              </button>
            </div>
          </div>
        );
      }
      if (stage === 'preview' && file) {
        return (
          <div key="preview" className="uk-step-wizard__panel">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="uk-step-wizard__thumb" />
            ) : (
              <div className="uk-step-wizard__thumb" aria-hidden="true" />
            )}
            <h3 className="uk-step-wizard__title">{file.name}</h3>
            <p className="uk-step-wizard__sub">{formatBytes(file.size)}</p>
            <div className="uk-step-wizard__actions">
              <button type="button" className="uk-step-wizard__button" onClick={restart}>
                Back
              </button>
              <button
                type="button"
                className="uk-step-wizard__button"
                data-variant="primary"
                onClick={() => setStage('confirm')}
              >
                Next
              </button>
            </div>
          </div>
        );
      }
      if (stage === 'confirm' && file) {
        return (
          <div key="confirm" className="uk-step-wizard__panel">
            <h3 className="uk-step-wizard__title">Upload {file.name}?</h3>
            <p className="uk-step-wizard__sub">
              {formatBytes(file.size)} · {file.type || 'unknown type'}
            </p>
            <div className="uk-step-wizard__actions">
              <button type="button" className="uk-step-wizard__button" onClick={() => setStage('preview')}>
                Cancel
              </button>
              <button
                type="button"
                className="uk-step-wizard__button"
                data-variant="primary"
                onClick={startUpload}
              >
                Confirm
              </button>
            </div>
          </div>
        );
      }
      if (stage === 'upload') {
        return (
          <div key="upload" className="uk-step-wizard__panel">
            <h3 className="uk-step-wizard__title">Uploading…</h3>
            <p className="uk-step-wizard__sub">{progress}%</p>
            <div
              className="uk-progress-bar__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Upload progress"
              style={{ width: '100%' }}
            >
              <div className="uk-progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      }
      if (stage === 'done') {
        return (
          <div key="done" className="uk-step-wizard__panel">
            <div className="uk-step-wizard__check" aria-hidden="true">
              {CHECK_ICON}
            </div>
            <h3 className="uk-step-wizard__title">Upload complete</h3>
            <p className="uk-step-wizard__sub">Your file is live.</p>
            <div className="uk-step-wizard__actions">
              <button
                type="button"
                className="uk-step-wizard__button"
                data-variant="primary"
                onClick={restart}
              >
                Upload another
              </button>
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div
        ref={ref}
        className={mergeClass('uk-step-wizard', className)}
        data-uk-element="container"
        data-state={stage}
        role="region"
        aria-label="Upload wizard"
      >
        <div className="uk-step-wizard__nav" aria-hidden="true">
          {STAGES.map((s, i) => (
            <span
              key={s}
              className="uk-step-wizard__dot"
              data-active={i === currentIndex ? 'true' : 'false'}
              data-done={i < currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>

        <div className="uk-step-wizard__stage" aria-live="polite">
          {AnimatePresence && MotionDiv ? (
            <AnimatePresence mode="wait" initial={false}>
              <MotionDiv
                key={stage}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="uk-step-wizard__panel"
              >
                {renderPanel()?.props.children}
              </MotionDiv>
            </AnimatePresence>
          ) : (
            renderPanel()
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept?.join(',')}
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);

UploadStepWizard.displayName = 'UploadStepWizard';
