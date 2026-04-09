'use client';

import { Button } from '@uploadkitdev/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
  hasMore: boolean;
  isLoading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  hasPrevious: boolean;
  showingCount: number;
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
}

export function DataTablePagination({
  hasMore,
  isLoading,
  onNextPage,
  onPreviousPage,
  hasPrevious,
  showingCount,
  totalCount,
  pageNumber = 1,
  pageSize = 20,
}: DataTablePaginationProps) {
  const showRangeLabel =
    totalCount !== undefined && totalCount > 0;
  const startIndex = (pageNumber - 1) * pageSize + 1;
  const endIndex = Math.min(pageNumber * pageSize, totalCount ?? showingCount);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {showRangeLabel
          ? `Showing ${startIndex}–${endIndex} of ${totalCount} files`
          : `Showing ${showingCount} ${showingCount === 1 ? 'file' : 'files'}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPrevious || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasMore || isLoading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
