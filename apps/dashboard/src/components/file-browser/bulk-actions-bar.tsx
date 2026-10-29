'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@uploadkitdev/ui';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
}

/** Selection count and bulk delete, confirmed in a dialog. */
export function BulkActionsBar({ selectedCount, onDelete }: BulkActionsBarProps) {
  const noun = selectedCount === 1 ? 'file' : 'files';
  return (
    <div className="flex items-center gap-2 md:ml-auto">
      <span className="text-sm tabular-nums text-muted-foreground" role="status">
        {selectedCount} selected
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" className="pd-button pd-button--secondary" style={{ minHeight: '2rem', padding: '0 var(--pd-space-4)' }}>
            Delete
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} {noun}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} {noun}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
