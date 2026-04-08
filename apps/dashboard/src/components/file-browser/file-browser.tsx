'use client';

import * as React from 'react';
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  Checkbox,
} from '@uploadkit/ui';
import { MoreHorizontal, ArrowUpDown, Copy, Trash2 } from 'lucide-react';
import { DataTable } from '../data-table/data-table';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { DataTablePagination } from '../data-table/data-table-pagination';
import { FilePreviewCell } from './file-preview-cell';
import { useFiles, type FileRecord } from '../../hooks/use-files';
import { formatBytes, formatDate } from '../../lib/format';

const columnHelper = createColumnHelper<FileRecord>();

interface FileBrowserProps {
  slug: string;
}

export function FileBrowser({ slug }: FileBrowserProps) {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Current cursor = top of stack, empty string = first page
  const currentCursor = cursorStack[cursorStack.length - 1] ?? '';

  const { files, isLoading, nextCursor, hasMore, mutate } = useFiles({
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

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => undefined);
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
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{getValue()}</span>
      ),
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="File actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleCopyUrl(row.original.url)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDeleteSingle(row.original._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar
        onSearch={handleSearch}
        onTypeFilter={handleTypeFilter}
        selectedCount={selectedIds.length}
        onDeleteSelected={handleDeleteSelected}
      />
      <DataTable
        columns={columns as ColumnDef<FileRecord, unknown>[]}
        data={files}
        isLoading={isLoading}
        getRowId={(row) => row._id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
      <DataTablePagination
        hasMore={hasMore}
        isLoading={isLoading}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPrevious={cursorStack.length > 0}
        showingCount={files.length}
      />
    </div>
  );
}
