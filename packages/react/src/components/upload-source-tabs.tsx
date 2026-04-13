import { forwardRef, useCallback, useRef, useState, useEffect } from 'react';
import type { UploadResult } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';
import { mergeClass } from '../utils/merge-class';
import { formatBytes } from '../utils/format-bytes';
import { useOptionalMotion, useReducedMotionSafe } from '../utils/motion-optional';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'device' | 'url' | 'clipboard';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type UploadSourceTabsProps = {
  /** Route name defined in your fileRouter */
  route: string;
  /** Accepted MIME types (UX validation only — server enforces authoritative check) */
  accept?: string[];
  /** Maximum file size in bytes (UX validation only) */
  maxSize?: number;
  /** Extra metadata forwarded to the upload API */
  metadata?: Record<string, unknown>;
  /** Called after the file finishes uploading successfully */
  onUploadComplete?: (result: UploadResult) => void;
  /** Called when the upload fails */
  onUploadError?: (error: Error) => void;
  /** Additional CSS class(es) for the root element */
  className?: string;
  /** Which tabs to render (default: all three) */
  tabs?: TabId[];
};

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const UPLOAD_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CLIPBOARD_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const CHECK_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ERROR_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── Tab label map ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<TabId, string> = {
  device: 'Device',
  url: 'URL',
  clipboard: 'Clipboard',
};

// ─── Drag state hook (scoped to the Device panel) ─────────────────────────────

function usePanelDragState(onDrop: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  // Counter technique avoids flicker when dragging over child elements
  const counter = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    counter.current += 1;
    if (counter.current === 1) setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    counter.current -= 1;
    if (counter.current === 0) setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDropHandler = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      counter.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onDrop(files);
    },
    [onDrop],
  );

  return {
    isDragging,
    handlers: { onDragEnter, onDragLeave, onDragOver, onDrop: onDropHandler },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * UploadSourceTabs — compact Cloudinary/Uppy-inspired card with tabbed upload
 * source selection: Device (file picker + drag-drop), URL (fetch-then-upload),
 * and Clipboard (paste from clipboard).
 *
 * Architecture:
 *  - Single-file upload pattern (one active upload at a time).
 *  - All styling via inline styles + CSS custom properties — no Tailwind.
 *  - Optional motion/react integration: tab indicator slides with layoutId
 *    when the package is available, falls back to border-bottom otherwise.
 *  - URL tab fetches the remote file as a Blob, then uploads it through
 *    client.upload() — no server proxy required.
 *  - Clipboard tab listens to onPaste on the panel element; it reads
 *    clipboard items for files/images and uploads the first match.
 *
 * Accessibility:
 *  - Tab bar uses role="tablist" / role="tab" / role="tabpanel" ARIA pattern.
 *  - Focus-visible on all interactive elements.
 *  - prefers-reduced-motion respected via useReducedMotionSafe().
 */
export const UploadSourceTabs = forwardRef<HTMLDivElement, UploadSourceTabsProps>(
  (
    {
      route,
      accept,
      maxSize,
      metadata,
      onUploadComplete,
      onUploadError,
      className,
      tabs = ['device', 'url', 'clipboard'],
    },
    ref,
  ) => {
    const { client } = useUploadKitContext();
    const motion = useOptionalMotion();
    const prefersReducedMotion = useReducedMotionSafe();
    const canAnimate = motion !== null && !prefersReducedMotion;

    const [activeTab, setActiveTab] = useState<TabId>(tabs[0] ?? 'device');
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    // URL tab state
    const [urlValue, setUrlValue] = useState('');
    const [urlFetching, setUrlFetching] = useState(false);

    // Clipboard tab: track focus for accessibility hint
    const clipboardPanelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Core upload logic ──────────────────────────────────────────────────

    const uploadFile = useCallback(
      async (file: File) => {
        // Client-side validation
        if (accept && accept.length > 0) {
          const allowed = accept.some((pattern) => {
            if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
            return file.type === pattern;
          });
          if (!allowed) {
            const msg = `${file.name} — file type not allowed`;
            setStatus('error');
            setErrorMessage(msg);
            onUploadError?.(new Error(msg));
            return;
          }
        }

        if (maxSize !== undefined && file.size > maxSize) {
          const msg = `${file.name} exceeds the ${formatBytes(maxSize)} size limit`;
          setStatus('error');
          setErrorMessage(msg);
          onUploadError?.(new Error(msg));
          return;
        }

        setStatus('uploading');
        setProgress(0);
        setErrorMessage(null);
        setUploadedFileName(file.name);

        try {
          const result = await client.upload({
            file,
            route,
            ...(metadata !== undefined ? { metadata } : {}),
            onProgress: (percent) => setProgress(percent),
          });

          setStatus('success');
          setProgress(100);
          onUploadComplete?.(result);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setStatus('error');
          setProgress(0);
          setErrorMessage(error.message);
          onUploadError?.(error);
        }
      },
      [client, route, accept, maxSize, metadata, onUploadComplete, onUploadError],
    );

    // ── Device panel drag state ────────────────────────────────────────────

    const handleDeviceDrop = useCallback(
      (files: File[]) => {
        const file = files[0];
        if (file) void uploadFile(file);
      },
      [uploadFile],
    );

    const { isDragging, handlers: dragHandlers } = usePanelDragState(handleDeviceDrop);

    // ── Reset helper ───────────────────────────────────────────────────────

    function reset() {
      setStatus('idle');
      setProgress(0);
      setErrorMessage(null);
      setUploadedFileName(null);
      setUrlValue('');
    }

    // ── URL tab: fetch blob then upload ────────────────────────────────────

    const handleUrlUpload = useCallback(async () => {
      const trimmed = urlValue.trim();
      if (!trimmed) return;

      setUrlFetching(true);
      setStatus('idle');
      setErrorMessage(null);

      try {
        const response = await fetch(trimmed);
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);

        const blob = await response.blob();
        const fileName = trimmed.split('/').pop()?.split('?')[0] ?? 'file';
        const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

        setUrlFetching(false);
        await uploadFile(file);
      } catch (err) {
        setUrlFetching(false);
        const error = err instanceof Error ? err : new Error(String(err));
        setStatus('error');
        setErrorMessage(error.message);
        onUploadError?.(error);
      }
    }, [urlValue, uploadFile, onUploadError]);

    // ── Clipboard tab: handle paste ────────────────────────────────────────

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        e.preventDefault();
        const items = Array.from(e.clipboardData.items);

        // Prefer files; fall back to images
        const fileItem = items.find((item) => item.kind === 'file');
        if (!fileItem) return;

        const file = fileItem.getAsFile();
        if (!file) return;

        void uploadFile(file);
      },
      [uploadFile],
    );

    // ── Shared styles ──────────────────────────────────────────────────────

    const containerStyle: React.CSSProperties = {
      border: '1px solid var(--uk-border)',
      borderRadius: '12px',
      background: 'var(--uk-bg)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '400px',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    };

    const tabBarStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'row',
      borderBottom: '1px solid var(--uk-border)',
      background: 'var(--uk-bg-secondary, var(--uk-bg))',
      position: 'relative',
    };

    const contentAreaStyle: React.CSSProperties = {
      padding: '20px',
      minHeight: '120px',
      position: 'relative',
      boxSizing: 'border-box',
    };

    const progressBarWrapStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: 'var(--uk-border)',
      overflow: 'hidden',
    };

    const progressBarFillStyle: React.CSSProperties = {
      height: '100%',
      width: `${progress}%`,
      background: 'var(--uk-primary)',
      transition: 'width 200ms ease-out',
      borderRadius: '0 2px 2px 0',
    };

    // ── Tab button renderer ────────────────────────────────────────────────

    function renderTabButton(tabId: TabId) {
      const isActive = activeTab === tabId;

      const baseTabStyle: React.CSSProperties = {
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        outline: 'none',
        position: 'relative',
        // Active state: color + border-bottom indicator
        color: isActive ? 'var(--uk-primary)' : 'var(--uk-text-secondary)',
        // Static fallback indicator (shown when motion not available)
        borderBottom: !canAnimate && isActive
          ? '2px solid var(--uk-primary)'
          : '2px solid transparent',
        // Offset so the active border sits on top of the tab bar's bottom border
        marginBottom: '-1px',
        transition: 'color 150ms ease-out',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      };

      return (
        <button
          key={tabId}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-controls={`uk-source-tabs-panel-${tabId}`}
          id={`uk-source-tabs-tab-${tabId}`}
          style={baseTabStyle}
          className="uk-source-tabs__tab"
          onClick={() => {
            reset();
            setActiveTab(tabId);
          }}
        >
          {TAB_LABELS[tabId]}

          {/* Motion animated underline indicator */}
          {canAnimate && isActive && (() => {
            const MotionDiv = motion.motion.div as React.ElementType;
            return (
              <MotionDiv
                layoutId="uk-source-tabs-indicator"
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--uk-primary)',
                  borderRadius: '2px 2px 0 0',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            );
          })()}
        </button>
      );
    }

    // ── Panel: Device ──────────────────────────────────────────────────────

    function renderDevicePanel() {
      const dropzoneStyle: React.CSSProperties = {
        border: `2px dashed ${isDragging ? 'var(--uk-primary)' : 'var(--uk-border)'}`,
        borderRadius: '8px',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: 'pointer',
        background: isDragging ? 'color-mix(in srgb, var(--uk-primary) 6%, transparent)' : 'transparent',
        transition: 'border-color 150ms ease-out, background 150ms ease-out',
        outline: 'none',
        userSelect: 'none',
        textAlign: 'center',
      };

      const iconStyle: React.CSSProperties = {
        color: isDragging ? 'var(--uk-primary)' : 'var(--uk-text-secondary)',
        transition: 'color 150ms ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };

      const labelStyle: React.CSSProperties = {
        fontSize: '14px',
        color: 'var(--uk-text-primary, var(--uk-text-secondary))',
        margin: 0,
      };

      const hintStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--uk-text-secondary)',
        margin: 0,
      };

      return (
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose file or drag here"
          style={dropzoneStyle}
          className="uk-source-tabs__dropzone"
          {...dragHandlers}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <span style={iconStyle}>{UPLOAD_ICON}</span>
          <p style={labelStyle}>
            <strong>Choose file</strong> or drag here
          </p>
          {accept && accept.length > 0 && (
            <p style={hintStyle}>{accept.join(', ')}</p>
          )}
          {maxSize !== undefined && (
            <p style={hintStyle}>Max size: {formatBytes(maxSize)}</p>
          )}
        </div>
      );
    }

    // ── Panel: URL ─────────────────────────────────────────────────────────

    function renderUrlPanel() {
      const inputStyle: React.CSSProperties = {
        width: '100%',
        border: '1px solid var(--uk-border)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '13px',
        background: 'var(--uk-bg)',
        color: 'var(--uk-text-primary, inherit)',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 150ms ease-out',
      };

      const buttonStyle: React.CSSProperties = {
        marginTop: '10px',
        width: '100%',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 600,
        background: urlFetching ? 'var(--uk-border)' : 'var(--uk-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: urlFetching ? 'not-allowed' : 'pointer',
        transition: 'background 150ms ease-out, opacity 150ms ease-out',
        opacity: !urlValue.trim() || urlFetching ? 0.5 : 1,
      };

      return (
        <div className="uk-source-tabs__url-panel">
          <input
            type="url"
            placeholder="Paste file URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            style={inputStyle}
            aria-label="File URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlValue.trim() && !urlFetching) {
                void handleUrlUpload();
              }
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--uk-primary)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--uk-border)';
            }}
          />
          <button
            type="button"
            style={buttonStyle}
            disabled={!urlValue.trim() || urlFetching}
            onClick={() => void handleUrlUpload()}
            aria-label="Upload file from URL"
          >
            {urlFetching ? 'Fetching…' : 'Upload'}
          </button>
        </div>
      );
    }

    // ── Panel: Clipboard ───────────────────────────────────────────────────

    function renderClipboardPanel() {
      const pasteAreaStyle: React.CSSProperties = {
        border: '2px dashed var(--uk-border)',
        borderRadius: '8px',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        outline: 'none',
        cursor: 'default',
        transition: 'border-color 150ms ease-out',
        textAlign: 'center',
      };

      const iconStyle: React.CSSProperties = {
        color: 'var(--uk-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
      };

      const labelStyle: React.CSSProperties = {
        fontSize: '14px',
        color: 'var(--uk-text-primary, var(--uk-text-secondary))',
        margin: 0,
      };

      const kbdStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: '2px 6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        background: 'var(--uk-bg-secondary, var(--uk-border))',
        border: '1px solid var(--uk-border)',
        borderRadius: '4px',
        color: 'var(--uk-text-secondary)',
      };

      return (
        <div
          ref={clipboardPanelRef}
          tabIndex={0}
          role="region"
          aria-label="Paste area — press Ctrl+V or Cmd+V to paste a file"
          style={pasteAreaStyle}
          className="uk-source-tabs__clipboard-panel"
          onPaste={handlePaste}
          onFocus={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--uk-primary)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--uk-border)';
          }}
        >
          <span style={iconStyle}>{CLIPBOARD_ICON}</span>
          <p style={labelStyle}>
            Press{' '}
            <kbd style={kbdStyle}>Ctrl+V</kbd>
            {' / '}
            <kbd style={kbdStyle}>⌘V</kbd>
            {' '}to paste from clipboard
          </p>
          <p style={{ fontSize: '12px', color: 'var(--uk-text-secondary)', margin: 0 }}>
            Supports images and files
          </p>
        </div>
      );
    }

    // ── Upload feedback overlay ────────────────────────────────────────────

    function renderFeedback() {
      if (status === 'idle') return null;

      const feedbackStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '80px',
        textAlign: 'center',
      };

      if (status === 'uploading') {
        return (
          <div style={feedbackStyle} aria-live="polite" aria-atomic="true">
            <p style={{ fontSize: '13px', color: 'var(--uk-text-secondary)', margin: 0 }}>
              Uploading{uploadedFileName ? ` ${uploadedFileName}` : ''}…
            </p>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--uk-primary)',
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
              aria-label={`${progress} percent complete`}
            >
              {progress}%
            </p>
          </div>
        );
      }

      if (status === 'success') {
        return (
          <div style={feedbackStyle} aria-live="polite" aria-atomic="true">
            <span style={{ color: 'var(--uk-success, #22c55e)', display: 'flex', alignItems: 'center' }}>
              {CHECK_ICON}
            </span>
            <p style={{ fontSize: '13px', color: 'var(--uk-text-secondary)', margin: 0 }}>
              {uploadedFileName ? `${uploadedFileName} uploaded` : 'Upload complete'}
            </p>
            <button
              type="button"
              style={{
                marginTop: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'none',
                border: '1px solid var(--uk-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--uk-text-secondary)',
              }}
              onClick={reset}
            >
              Upload another
            </button>
          </div>
        );
      }

      if (status === 'error') {
        return (
          <div style={feedbackStyle} aria-live="assertive" aria-atomic="true">
            <span style={{ color: 'var(--uk-error, #ef4444)', display: 'flex', alignItems: 'center' }}>
              {ERROR_ICON}
            </span>
            <p style={{ fontSize: '13px', color: 'var(--uk-error, #ef4444)', margin: 0 }}>
              {errorMessage ?? 'Upload failed'}
            </p>
            <button
              type="button"
              style={{
                marginTop: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'none',
                border: '1px solid var(--uk-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--uk-text-secondary)',
              }}
              onClick={reset}
            >
              Try again
            </button>
          </div>
        );
      }

      return null;
    }

    // ── Render ─────────────────────────────────────────────────────────────

    const isTransacting = status === 'uploading' || urlFetching;

    return (
      <div
        ref={ref}
        className={mergeClass('uk-source-tabs', className)}
        style={containerStyle}
        data-uk-element="container"
        data-state={status}
        data-active-tab={activeTab}
      >
        {/* Tab bar */}
        <div
          style={tabBarStyle}
          role="tablist"
          aria-label="Upload source"
          className="uk-source-tabs__tabbar"
        >
          {tabs.map((tabId) => renderTabButton(tabId))}
        </div>

        {/* Tab content area */}
        <div
          id={`uk-source-tabs-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`uk-source-tabs-tab-${activeTab}`}
          style={contentAreaStyle}
          className="uk-source-tabs__content"
        >
          {/* Show feedback overlay during/after upload; show tab panel otherwise */}
          {isTransacting || status === 'success' || status === 'error'
            ? renderFeedback()
            : (
              <>
                {activeTab === 'device' && renderDevicePanel()}
                {activeTab === 'url' && renderUrlPanel()}
                {activeTab === 'clipboard' && renderClipboardPanel()}
              </>
            )}

          {/* Thin progress bar pinned to the bottom of the content area */}
          {isTransacting && (
            <div
              style={progressBarWrapStyle}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading: ${progress}%`}
            >
              <div style={progressBarFillStyle} />
            </div>
          )}
        </div>

        {/* Hidden file input for Device tab */}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept?.join(',')}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            // Reset so same file can be re-selected
            e.target.value = '';
          }}
        />

        {/* Screen-reader live region */}
        <span
          className="uk-sr-only"
          aria-live="polite"
          aria-atomic="true"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
        >
          {status === 'uploading' && `Uploading${uploadedFileName ? ` ${uploadedFileName}` : ''}: ${progress}%`}
          {status === 'success' && `${uploadedFileName ?? 'File'} uploaded successfully`}
          {status === 'error' && `Upload failed: ${errorMessage ?? 'unknown error'}`}
        </span>
      </div>
    );
  },
);

UploadSourceTabs.displayName = 'UploadSourceTabs';
