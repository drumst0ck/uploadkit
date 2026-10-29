'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@uploadkitdev/ui';
import { useProjects } from '../hooks/use-projects';

interface CreateProjectDialogProps {
  children?: React.ReactNode;
  /** Controlled mode — omit children when using open/onOpenChange */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { mutate } = useProjects();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/internal/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create project. Please try again.');
        return;
      }

      const project = (await res.json()) as { slug: string };
      await mutate();
      setOpen(false);
      setName('');
      router.push(`/dashboard/projects/${project.slug}`);
    } catch {
      setError('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName('');
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent data-ui className="bg-popover border-border text-foreground shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create a new project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="pd-label">
              Project name
            </label>
            <input
              id="project-name"
              className="pd-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              maxLength={50}
              autoFocus
              disabled={isSubmitting}
              aria-invalid={error ? true : undefined}
            />
            {error && (
              <p className="pd-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="pd-button pd-button--ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pd-button pd-button--primary"
              disabled={!name.trim() || isSubmitting}
              aria-busy={isSubmitting || undefined}
            >
              {isSubmitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
