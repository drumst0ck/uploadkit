'use client';

import * as React from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle } from 'lucide-react';

const PART_SIZE = 5 * 1024 * 1024; // 5 MiB
const MIN_MULTIPART_SIZE = 10 * 1024 * 1024; // 10 MiB
const CONCURRENCY = 3;

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface DashboardUploadDropzoneProps {
  slug: string;
  onUploadComplete: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Upload a single file via presigned PUT with XHR for progress.
function xhrPut(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etagHeader = xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('etag');
        const etag = etagHeader ? etagHeader.replace(/"/g, '') : null;
        resolve({ etag });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });
}

async function uploadSingle(
  slug: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  // 1. Request presigned URL
  const reqRes = await fetch(`/api/internal/projects/${slug}/upload/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!reqRes.ok) {
    const err = await reqRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed (${reqRes.status})`);
  }
  const { fileId, uploadUrl } = (await reqRes.json()) as { fileId: string; uploadUrl: string };

  // 2. PUT to R2
  await xhrPut(uploadUrl, file, file.type || 'application/octet-stream', onProgress);

  // 3. Notify server
  const completeRes = await fetch(`/api/internal/projects/${slug}/upload/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Complete failed (${completeRes.status})`);
  }
}

async function uploadMultipart(
  slug: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  // 1. Init
  const initRes = await fetch(`/api/internal/projects/${slug}/upload/multipart/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Init failed (${initRes.status})`);
  }
  const { fileId, uploadId, parts } = (await initRes.json()) as {
    fileId: string;
    uploadId: string;
    parts: Array<{ partNumber: number; uploadUrl: string }>;
  };

  // 2. Upload parts with concurrency cap
  const results: Array<{ partNumber: number; etag: string }> = [];
  let completed = 0;
  try {
    for (let i = 0; i < parts.length; i += CONCURRENCY) {
      const batch = parts.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async ({ partNumber, uploadUrl }) => {
          const start = (partNumber - 1) * PART_SIZE;
          const end = Math.min(start + PART_SIZE, file.size);
          const chunk = file.slice(start, end);
          const { etag } = await xhrPut(uploadUrl, chunk, 'application/octet-stream');
          if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);
          return { partNumber, etag };
        }),
      );
      results.push(...batchResults);
      completed += batch.length;
      onProgress(Math.round((completed / parts.length) * 100));
    }
  } catch (err) {
    // Abort on any failure
    await fetch(`/api/internal/projects/${slug}/upload/multipart/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, uploadId }),
    }).catch(() => undefined);
    throw err;
  }

  // 3. Complete
  results.sort((a, b) => a.partNumber - b.partNumber);
  const completeRes = await fetch(`/api/internal/projects/${slug}/upload/multipart/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, uploadId, parts: results }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Complete failed (${completeRes.status})`);
  }
}

export function DashboardUploadDropzone({ slug, onUploadComplete }: DashboardUploadDropzoneProps) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  const handleFiles = React.useCallback(
    async (fileList: FileList) => {
      const newItems: UploadItem[] = Array.from(fileList).map((file, idx) => ({
        id: `${Date.now()}-${idx}-${file.name}`,
        file,
        status: 'idle' as const,
        progress: 0,
      }));
      setItems((prev) => [...prev, ...newItems]);

      const updateItem = (id: string, patch: Partial<UploadItem>) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      };

      await Promise.all(
        newItems.map(async (item) => {
          updateItem(item.id, { status: 'uploading', progress: 0 });
          try {
            if (item.file.size > MIN_MULTIPART_SIZE) {
              await uploadMultipart(slug, item.file, (p) => updateItem(item.id, { progress: p }));
            } else {
              await uploadSingle(slug, item.file, (p) => updateItem(item.id, { progress: p }));
            }
            updateItem(item.id, { status: 'success', progress: 100 });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            updateItem(item.id, { status: 'error', error: message });
          }
        }),
      );

      onUploadComplete();
    },
    [slug, onUploadComplete],
  );

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragActive(false);
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };
  const onClick = () => inputRef.current?.click();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((it) => it.status !== 'success'));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`group relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-border/60 hover:border-border hover:bg-muted/30'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground group-hover:text-foreground transition-colors">
          <UploadCloud className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm">
          <strong className="font-medium text-foreground">Drop files here</strong>{' '}
          <span className="text-muted-foreground">or click to browse</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Files over 10 MiB are uploaded in parallel chunks
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={onInputChange}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {items.filter((i) => i.status === 'success').length} / {items.length} uploaded
            </span>
            {items.some((i) => i.status === 'success') && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="flex-shrink-0">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  ) : item.status === 'error' ? (
                    <AlertCircle
                      className="h-4 w-4 text-red-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-foreground">
                      {item.file.name}
                    </span>
                    <span className="flex-shrink-0 text-muted-foreground">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && item.error && (
                    <p className="mt-0.5 text-red-400 truncate" title={item.error}>
                      {item.error}
                    </p>
                  )}
                </div>
                {item.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.id !== item.id))
                    }
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
