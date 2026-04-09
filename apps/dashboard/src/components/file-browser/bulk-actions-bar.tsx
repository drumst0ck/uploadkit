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
  Button,
} from '@uploadkitdev/ui';
import { Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete }: BulkActionsBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {selectedCount} {selectedCount === 1 ? 'file' : 'files'} selected
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete selected
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} {selectedCount === 1 ? 'file' : 'files'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount}{' '}
              {selectedCount === 1 ? 'file' : 'files'}. This action cannot be undone.
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
