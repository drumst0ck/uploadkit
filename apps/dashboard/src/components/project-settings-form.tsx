'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
} from '@uploadkit/ui';

interface ProjectSettingsFormProps {
  initialName: string;
  slug: string;
}

export function ProjectSettingsForm({ initialName, slug }: ProjectSettingsFormProps) {
  const router = useRouter();

  // Name edit state
  const [name, setName] = React.useState(initialName);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Copy slug state
  const [slugCopied, setSlugCopied] = React.useState(false);

  // Delete project state
  const [confirmName, setConfirmName] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/internal/projects/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSaveError(data.error ?? 'Failed to save changes.');
        return;
      }

      const updated = (await res.json()) as { name: string; slug: string };
      setSaveSuccess(true);

      // If slug changed (name changed), navigate to the new settings URL
      if (updated.slug !== slug) {
        router.push(`/dashboard/projects/${updated.slug}/settings`);
      } else {
        router.refresh();
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProject() {
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? 'Failed to delete project.');
        setIsDeleting(false);
        return;
      }

      router.push('/dashboard/projects');
    } catch {
      setDeleteError('Network error. Please try again.');
      setIsDeleting(false);
    }
  }

  async function handleCopySlug() {
    await navigator.clipboard.writeText(slug);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  }

  // Delete requires typing the exact project name to confirm
  const canConfirmDelete = confirmName.trim() === initialName;

  return (
    <div className="flex flex-col gap-8">
      {/* General section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-medium text-foreground">General</h2>

        <form onSubmit={(e) => { void handleSaveName(e); }} className="flex flex-col gap-4">
          {/* Project name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveSuccess(false);
              }}
              maxLength={50}
              placeholder="My Project"
              className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
          </div>

          {/* Slug (read-only + copy) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project slug</label>
            <div className="flex items-center gap-2">
              <p className="flex-1 rounded-lg border border-border bg-white/[0.02] px-3 py-2 font-mono text-sm text-foreground0">
                {slug}
              </p>
              <button
                type="button"
                onClick={() => { void handleCopySlug(); }}
                aria-label="Copy slug"
                className="rounded-lg border border-border bg-accent px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                {slugCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Slug is auto-derived from the project name when you save.
            </p>
          </div>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          {saveSuccess && (
            <p className="text-xs text-emerald-400">Project name saved successfully.</p>
          )}

          <div className="flex">
            <button
              type="submit"
              disabled={isSaving || name.trim().length === 0 || name.trim().length > 50}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6">
        <h2 className="mb-2 text-sm font-medium text-red-400">Danger Zone</h2>
        <p className="mb-5 text-sm text-foreground0">
          Permanently delete this project and all its files, API keys, and routes. This action
          cannot be undone.
        </p>

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setConfirmName('');
              setDeleteError('');
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
              Delete Project
            </button>
          </AlertDialogTrigger>

          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Delete project permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground0">
                This will permanently delete this project and all its files, API keys, and routes.
                This action{' '}
                <span className="font-medium text-foreground">cannot be undone</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Typed project name confirmation */}
            <div className="flex flex-col gap-2 py-2">
              <label className="text-xs font-medium text-muted-foreground">
                Type the project name to confirm:{' '}
                <span className="font-mono text-foreground">{initialName}</span>
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={initialName}
                autoComplete="off"
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors"
              />
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="border-border bg-accent text-foreground hover:bg-accent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!canConfirmDelete || isDeleting}
                onClick={() => { void handleDeleteProject(); }}
                className="bg-red-600 text-foreground hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
