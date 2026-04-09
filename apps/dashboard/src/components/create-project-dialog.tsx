'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
} from '@uploadkitdev/ui';
import { useProjects } from '../hooks/use-projects';

interface CreateProjectDialogProps {
  children: React.ReactNode;
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const [open, setOpen] = React.useState(false);
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

      // Refresh SWR cache for ProjectSwitcher and projects page
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
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create a new project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="project-name"
              className="text-sm font-medium text-foreground"
            >
              Project name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              maxLength={50}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500"
              autoFocus
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-foreground disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
