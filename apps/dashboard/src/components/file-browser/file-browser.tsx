'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  Button,
  Checkbox,
} from '@uploadkitdev/ui';
import { Link2, ArrowUpDown, Trash2, Check, WandSparkles } from 'lucide-react';
import { DataTable } from '../data-table/data-table';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { DataTablePagination } from '../data-table/data-table-pagination';
import { FilePreviewCell } from './file-preview-cell';
import { DashboardUploadDropzone } from './dashboard-upload-dropzone';
import { useFiles, type FileRecord } from '../../hooks/use-files';
import { formatBytes, formatDate } from '../../lib/format';

const columnHelper = createColumnHelper<FileRecord>();

function getTypeBadgeClasses(mime: string): string {
  if (mime.startsWith('image/')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (mime.startsWith('video/')) return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (mime.startsWith('audio/')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (
    mime.startsWith('application/pdf') ||
    mime.startsWith('application/doc') ||
    mime.startsWith('application/msword') ||
    mime.startsWith('application/vnd.openxmlformats')
  )
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20';
}

interface FileBrowserProps {
  slug: string;
}

export function FileBrowser({ slug }: FileBrowserProps) {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Current cursor = top of stack, empty string = first page
  const currentCursor = cursorStack[cursorStack.length - 1] ?? '';

  const { files, isLoading, nextCursor, hasMore, totalCount, mutate } = useFiles({
    slug,
    search,
    typeFilter,
    cursor: currentCursor,
  });

  // Reset row selection when cursor changes (Pitfall 6)
  const prevCursorRef = React.useRef(currentCursor);
  React.useEffect(() => {
    if (prevCursorRef.current !== currentCursor) {
      setRowSelection({});
      prevCursorRef.current = currentCursor;
    }
  }, [currentCursor]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorStack((prev) => [...prev, nextCursor]);
    }
  };

  const handlePreviousPage = () => {
    setCursorStack((prev) => prev.slice(0, -1));
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    // Reset pagination on new search
    setCursorStack([]);
    setRowSelection({});
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    // Reset pagination on filter change
    setCursorStack([]);
    setRowSelection({});
  };

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handleDeleteSelected = async () => {
    try {
      const res = await fetch(`/api/internal/projects/${slug}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selectedIds }),
      });
      if (res.ok) {
        setRowSelection({});
        mutate();
      }
    } catch {
      // Error handled silently — mutate will keep current state
    }
  };

  const handleCopyUrl = async (fileId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopiedId(fileId);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteSingle = async (fileId: string) => {
    try {
      const res = await fetch(`/api/internal/projects/${slug}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [fileId] }),
      });
      if (res.ok) {
        mutate();
      }
    } catch {
      // no-op
    }
  };

  const columns = [
    // Column 1: select
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    }),
    // Column 2: preview
    columnHelper.accessor('type', {
      id: 'preview',
      header: '',
      cell: ({ row }) => (
        <FilePreviewCell
          file={{
            name: row.original.name,
            type: row.original.type,
            url: row.original.url,
          }}
        />
      ),
    }),
    // Column 3: name (sortable)
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="max-w-[200px] truncate font-medium block">
          {getValue()}
        </span>
      ),
    }),
    // Column 4: size
    columnHelper.accessor('size', {
      header: 'Size',
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatBytes(getValue())}</span>
      ),
    }),
    // Column 5: type
    columnHelper.accessor('type', {
      id: 'mimeType',
      header: 'Type',
      cell: ({ getValue }) => {
        const mime = getValue();
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getTypeBadgeClasses(mime)}`}
          >
            {mime}
          </span>
        );
      },
    }),
    // Column 6: createdAt
    columnHelper.accessor('createdAt', {
      header: 'Uploaded',
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(getValue())}
        </span>
      ),
    }),
    // Column 7: actions
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.type.startsWith('image/') ? (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-400">
              <Link href={`/dashboard/projects/${slug}/transforms?file=${row.original._id}`} aria-label={`Transform ${row.original.name}`} title="Transform image">
                <WandSparkles className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              copiedId === row.original._id
                ? 'text-emerald-400 hover:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleCopyUrl(row.original._id, row.original.url)}
            aria-label={copiedId === row.original._id ? 'Copied!' : 'Copy file URL'}
            title={copiedId === row.original._id ? 'Copied!' : 'Copy file URL'}
          >
            {copiedId === row.original._id ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-400"
            onClick={() => handleDeleteSingle(row.original._id)}
            aria-label="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <DashboardUploadDropzone slug={slug} onUploadComplete={() => mutate()} />
      <DataTableToolbar
        onSearch={handleSearch}
        onTypeFilter={handleTypeFilter}
        selectedCount={selectedIds.length}
        onDeleteSelected={handleDeleteSelected}
      />
      <div className="hidden md:block">
        <DataTable
          columns={columns as ColumnDef<FileRecord, unknown>[]}
          data={files}
          isLoading={isLoading}
          getRowId={(row) => row._id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>

      <div className="grid gap-3 md:hidden" aria-label="Files">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        )) : files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No files found.</div>
        ) : files.map((file) => {
          const selected = Boolean(rowSelection[file._id]);
          return (
            <article key={file._id} className={`flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors ${selected ? 'border-indigo-500 bg-indigo-500/5' : 'border-border'}`}>
              <Checkbox checked={selected} onCheckedChange={(value) => setRowSelection((current) => ({ ...current, [file._id]: Boolean(value) }))} aria-label={`Select ${file.name}`} />
              <FilePreviewCell file={{ name: file.name, type: file.type, url: file.url }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)} · {formatDate(file.createdAt)}</p>
                <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium ${getTypeBadgeClasses(file.type)}`}>{file.type}</span>
              </div>
              <div className="flex flex-col gap-1">
                {file.type.startsWith('image/') ? (
                  <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-indigo-400">
                    <Link href={`/dashboard/projects/${slug}/transforms?file=${file._id}`} aria-label={`Transform ${file.name}`}><WandSparkles className="h-4 w-4" /></Link>
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleCopyUrl(file._id, file.url)} aria-label={`Copy URL for ${file.name}`}>
                  {copiedId === file._id ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-red-400" onClick={() => handleDeleteSingle(file._id)} aria-label={`Delete ${file.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </article>
          );
        })}
      </div>
      <DataTablePagination
        hasMore={hasMore}
        isLoading={isLoading}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPrevious={cursorStack.length > 0}
        showingCount={files.length}
        totalCount={totalCount}
        pageNumber={cursorStack.length + 1}
        pageSize={20}
      />
    </div>
  );
}
