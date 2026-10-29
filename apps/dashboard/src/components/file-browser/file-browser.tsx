'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BulkActionsBar } from './bulk-actions-bar';
import { DashboardUploadDropzone } from './dashboard-upload-dropzone';
import { FilePreviewDialog } from './file-preview-dialog';
import { fileKind } from './file-kind';
import { useFiles, type FileRecord } from '../../hooks/use-files';
import { formatBytes, formatNumber, formatRelative } from '../../lib/format';

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Images', value: 'image' },
  { label: 'Documents', value: 'application' },
  { label: 'Videos', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Text', value: 'text' },
];

const STATUS_WORD: Record<string, { word: string; dot: string }> = {
  UPLOADED: { word: 'Uploaded', dot: 'pd-dot--success' },
  UPLOADING: { word: 'Uploading', dot: 'pd-dot--warning' },
};

const SMALL_BTN: React.CSSProperties = { minHeight: '2rem', padding: '0 var(--pd-space-3)' };
const PAGE_SIZE = 20;

interface FileBrowserProps {
  slug: string;
  projectName: string;
  /** Live (uploaded) files and bytes in the project, from the server. */
  fileCount: number;
  totalBytes: number;
  /** Per-project usage strip, rendered by the server page. */
  usage: React.ReactNode;
}

export function FileBrowser({ slug, projectName, fileCount, totalBytes, usage }: FileBrowserProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc' | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectAllRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Debounce the search box; a new search resets pagination and selection.
  React.useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCursorStack([]);
      setRowSelection({});
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const currentCursor = cursorStack[cursorStack.length - 1] ?? '';

  const { files, isLoading, error, nextCursor, hasMore, totalCount, mutate } = useFiles({
    slug,
    search,
    typeFilter,
    cursor: currentCursor,
  });

  // Reset row selection when cursor changes
  const prevCursorRef = React.useRef(currentCursor);
  React.useEffect(() => {
    if (prevCursorRef.current !== currentCursor) {
      setRowSelection({});
      prevCursorRef.current = currentCursor;
    }
  }, [currentCursor]);

  const rows = React.useMemo(() => {
    if (!sortDir) return files;
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [files, sortDir]);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const pageSelected = rows.filter((f) => rowSelection[f._id]).length;
  const allSelected = rows.length > 0 && pageSelected === rows.length;

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = pageSelected > 0 && pageSelected < rows.length;
    }
  }, [pageSelected, rows.length]);

  const filtered = search !== '' || typeFilter !== '';
  const previewFile = previewId ? (files.find((f) => f._id === previewId) ?? null) : null;

  const refreshAll = () => {
    mutate();
    router.refresh();
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCursorStack([]);
    setRowSelection({});
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('');
    setCursorStack([]);
    setRowSelection({});
    searchRef.current?.focus();
  };

  const deleteFiles = async (ids: string[]) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/internal/projects/${slug}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      });
      if (res.ok) {
        setRowSelection((current) => {
          const next = { ...current };
          for (const id of ids) delete next[id];
          return next;
        });
        refreshAll();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? `Delete failed (${res.status})`);
      }
    } catch {
      setActionError('Delete failed: network error');
    }
  };

  const handleCopyUrl = async (file: FileRecord) => {
    try {
      await navigator.clipboard.writeText(file.url);
    } catch {
      return;
    }
    setCopiedId(file._id);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1600);
  };

  const openPreview = (file: FileRecord, el: HTMLElement) => {
    openerRef.current = el;
    setCopiedId(null);
    setPreviewId(file._id);
  };

  const toggleAll = (checked: boolean) => {
    setRowSelection((current) => {
      const next = { ...current };
      for (const f of rows) next[f._id] = checked;
      return next;
    });
  };

  const now = new Date();
  const hasNoFiles = !isLoading && !error && !filtered && totalCount === 0;
  const rangeStart = (cursorStack.length * PAGE_SIZE) + 1;
  const rangeEnd = cursorStack.length * PAGE_SIZE + files.length;

  return (
    <DashboardUploadDropzone slug={slug} onUploadComplete={refreshAll}>
      {({ open, queue }) => (
        <div>
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.02em]">Files</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {projectName} &middot; {formatNumber(fileCount)} {fileCount === 1 ? 'file' : 'files'} &middot; {formatBytes(totalBytes)}
              </p>
            </div>
            <button type="button" className="pd-button pd-button--primary" onClick={open}>
              Upload files
            </button>
          </header>

          <div className="mt-6">{usage}</div>

          {queue ? <div className="mt-4">{queue}</div> : null}

          <section className="mt-6" aria-label="File list">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="pd-field min-w-0 flex-1 basis-full sm:basis-auto sm:flex-none">
                <label className="sr-only" htmlFor="file-search">Search files by name</label>
                <input
                  ref={searchRef}
                  id="file-search"
                  className="pd-input sm:w-[300px]"
                  type="search"
                  placeholder="Search files by name"
                  autoComplete="off"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="pd-field">
                <label className="sr-only" htmlFor="file-type">Type</label>
                <div className="pd-select-wrap">
                  <select
                    id="file-type"
                    className="pd-select sm:w-[160px]"
                    value={typeFilter}
                    onChange={(e) => handleTypeFilter(e.target.value)}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedIds.length > 0 ? (
                <BulkActionsBar selectedCount={selectedIds.length} onDelete={() => deleteFiles(selectedIds)} />
              ) : null}
            </div>

            {actionError ? (
              <div role="alert" className="pd-state-error mb-3" style={{ padding: '12px 16px' }}>
                <p className="pd-error" style={{ margin: 0 }}>{actionError}</p>
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="pd-state-error">
                <h3>Files could not be loaded</h3>
                <p>Check your connection and try again. The list refreshes on its own every few seconds.</p>
                <button type="button" className="pd-button pd-button--secondary" style={SMALL_BTN} onClick={() => mutate()}>
                  Retry
                </button>
              </div>
            ) : hasNoFiles ? (
              <div className="pd-empty">
                <h3>No files yet</h3>
                <p>Files uploaded to {projectName} with the SDK or from here will appear in this list.</p>
                <button type="button" className="pd-button pd-button--secondary" style={SMALL_BTN} onClick={open}>
                  Upload files
                </button>
              </div>
            ) : (
              <>
                <div className="pd-table-wrap" style={{ maxHeight: 'none' }} role="region" aria-label={`Files in ${projectName}`} tabIndex={0}>
                  <table className="pd-table">
                    <caption className="sr-only">Files in {projectName}</caption>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: 44, padding: '0 8px 0 16px' }}>
                          <label className="pd-check" style={{ minHeight: '2rem' }}>
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => toggleAll(e.target.checked)}
                              disabled={rows.length === 0}
                            />
                            <span className="sr-only">Select all files on this page</span>
                          </label>
                        </th>
                        <th
                          scope="col"
                          style={{ padding: '0 12px' }}
                          aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'}
                        >
                          <button
                            type="button"
                            style={{ minHeight: '2.5rem' }}
                            onClick={() => setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null))}
                          >
                            Name
                          </button>
                        </th>
                        <th scope="col" className="hidden sm:table-cell" style={{ padding: '0 12px' }}>Type</th>
                        <th scope="col" style={{ padding: '0 12px' }}>Size</th>
                        <th scope="col" style={{ padding: '0 12px' }}>Status</th>
                        <th scope="col" className="hidden md:table-cell" style={{ padding: '0 12px' }}>Uploaded</th>
                        <th scope="col" style={{ padding: '0 16px 0 12px', textAlign: 'right' }}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading && rows.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} aria-hidden="true" style={{ height: '2.75rem' }}>
                            <td colSpan={7} style={{ padding: '0 16px' }}>
                              <span className="pd-skeleton" />
                            </td>
                          </tr>
                        ))
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="pd-table-empty">
                            No files match.{' '}
                            <button type="button" className="pd-button pd-button--ghost" style={SMALL_BTN} onClick={clearFilters}>
                              Clear filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        rows.map((file) => {
                          const status = STATUS_WORD[file.status] ?? { word: file.status, dot: '' };
                          const isImage = file.type.startsWith('image/');
                          const ready = file.status === 'UPLOADED';
                          const selected = Boolean(rowSelection[file._id]);
                          return (
                            <tr key={file._id} aria-selected={selected} style={{ height: '2.75rem' }}>
                              <td style={{ padding: '0 8px 0 16px' }}>
                                <label className="pd-check" style={{ minHeight: '2rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) =>
                                      setRowSelection((c) => ({ ...c, [file._id]: e.target.checked }))
                                    }
                                  />
                                  <span className="sr-only">Select {file.name}</span>
                                </label>
                              </td>
                              <td className="max-w-[160px] font-mono sm:max-w-[240px]" style={{ padding: '0 12px' }}>
                                {isImage && ready ? (
                                  <button
                                    type="button"
                                    className="block max-w-full truncate rounded-sm text-left font-mono hover:underline"
                                    style={{ all: 'unset', cursor: 'pointer', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderRadius: 4 }}
                                    onClick={(e) => openPreview(file, e.currentTarget)}
                                    aria-label={`View ${file.name}`}
                                    title={file.name}
                                  >
                                    {file.name}
                                  </button>
                                ) : (
                                  <span className="block truncate" title={file.name}>{file.name}</span>
                                )}
                              </td>
                              <td className="hidden font-mono text-muted-foreground sm:table-cell" style={{ padding: '0 12px' }}>
                                {fileKind(file.type)}
                              </td>
                              <td className="font-mono" style={{ padding: '0 12px' }}>{formatBytes(file.size)}</td>
                              <td style={{ padding: '0 12px' }}>
                                <span className="inline-flex items-center gap-2">
                                  <span className={`pd-dot ${status.dot}`} aria-hidden="true" />
                                  {status.word}
                                </span>
                              </td>
                              <td className="hidden text-muted-foreground md:table-cell" style={{ padding: '0 12px' }}>
                                {formatRelative(file.createdAt, now)}
                              </td>
                              <td style={{ padding: '0 16px 0 12px' }}>
                                <div className="flex items-center justify-end gap-1">
                                  {isImage && ready ? (
                                    <button
                                      type="button"
                                      className="pd-button pd-button--ghost"
                                      style={SMALL_BTN}
                                      onClick={(e) => openPreview(file, e.currentTarget)}
                                      aria-label={`View ${file.name}`}
                                    >
                                      View
                                    </button>
                                  ) : null}
                                  {ready ? (
                                    <button
                                      type="button"
                                      className="pd-button pd-button--ghost"
                                      style={SMALL_BTN}
                                      onClick={() => handleCopyUrl(file)}
                                      aria-label={`Copy URL for ${file.name}`}
                                    >
                                      {copiedId === file._id ? 'Copied' : 'Copy URL'}
                                    </button>
                                  ) : null}
                                  {isImage && ready ? (
                                    <Link
                                      href={`/dashboard/projects/${slug}/transforms?file=${file._id}`}
                                      className="pd-button pd-button--ghost"
                                      style={{ ...SMALL_BTN, textDecoration: 'none' }}
                                      aria-label={`Transform ${file.name}`}
                                    >
                                      Transform
                                    </Link>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="pd-button pd-button--ghost"
                                    style={SMALL_BTN}
                                    onClick={() => deleteFiles([file._id])}
                                    aria-label={`Delete ${file.name}`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                    {totalCount > 0
                      ? `Showing ${rangeStart}–${rangeEnd} of ${formatNumber(totalCount)} ${totalCount === 1 ? 'file' : 'files'}${filtered ? ' matching' : ''}`
                      : isLoading
                        ? 'Loading files'
                        : 'Showing 0 files'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="pd-button pd-button--secondary"
                      style={SMALL_BTN}
                      disabled={cursorStack.length === 0 || isLoading}
                      onClick={() => setCursorStack((prev) => prev.slice(0, -1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="pd-button pd-button--secondary"
                      style={SMALL_BTN}
                      disabled={!hasMore || isLoading}
                      onClick={() => nextCursor && setCursorStack((prev) => [...prev, nextCursor])}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <FilePreviewDialog
            file={previewFile}
            onClose={() => setPreviewId(null)}
            onCopy={handleCopyUrl}
            copied={previewFile !== null && copiedId === previewFile._id}
            opener={openerRef.current}
          />
        </div>
      )}
    </DashboardUploadDropzone>
  );
}
