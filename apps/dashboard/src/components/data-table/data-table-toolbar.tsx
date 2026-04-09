'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@uploadkitdev/ui';
import { BulkActionsBar } from '../file-browser/bulk-actions-bar';

interface DataTableToolbarProps {
  onSearch: (value: string) => void;
  onTypeFilter: (value: string) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
}

const TYPE_OPTIONS = [
  { label: 'All types', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Documents', value: 'application' },
  { label: 'Videos', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Text', value: 'text' },
];

export function DataTableToolbar({
  onSearch,
  onTypeFilter,
  selectedCount,
  onDeleteSelected,
}: DataTableToolbarProps) {
  const [searchValue, setSearchValue] = React.useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchValue}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        <Select onValueChange={(v) => onTypeFilter(v === 'all' ? '' : v)} defaultValue="all">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selectedCount}
          onDelete={onDeleteSelected}
        />
      )}
    </div>
  );
}
