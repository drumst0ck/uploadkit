'use client';

import * as React from 'react';
import useSWR from 'swr';
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
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uploadkitdev/ui';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { fetcher } from '../lib/fetcher';
import { formatBytes } from '../lib/format';

interface FileRouteRecord {
  _id: string;
  slug: string;
  allowedTypes: string[];
  maxFileSize: number;
  maxFileCount: number;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const COMMON_MIME_TYPES = [
  { label: 'Images (JPEG)', value: 'image/jpeg' },
  { label: 'Images (PNG)', value: 'image/png' },
  { label: 'Images (GIF)', value: 'image/gif' },
  { label: 'Images (WebP)', value: 'image/webp' },
  { label: 'Images (SVG)', value: 'image/svg+xml' },
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Video (MP4)', value: 'video/mp4' },
  { label: 'Video (WebM)', value: 'video/webm' },
  { label: 'Audio (MP3)', value: 'audio/mpeg' },
  { label: 'Audio (WAV)', value: 'audio/wav' },
  { label: 'Text (Plain)', value: 'text/plain' },
  { label: 'CSV', value: 'text/csv' },
  { label: 'ZIP', value: 'application/zip' },
];

interface RouteFormState {
  slug: string;
  allowedTypes: string[];
  maxFileSizeMB: string;
  maxFileCount: string;
  webhookUrl: string;
}

const DEFAULT_FORM: RouteFormState = {
  slug: '',
  allowedTypes: [],
  maxFileSizeMB: '4',
  maxFileCount: '1',
  webhookUrl: '',
};

interface FileRoutesTableProps {
  slug: string;
}

export function FileRoutesTable({ slug }: FileRoutesTableProps) {
  const { data: routes = [], isLoading, mutate } = useSWR<FileRouteRecord[]>(
    `/api/internal/projects/${slug}/routes`,
    fetcher,
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<FileRouteRecord | null>(null);
  const [form, setForm] = React.useState<RouteFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const openCreate = () => {
    setEditingRoute(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (route: FileRouteRecord) => {
    setEditingRoute(route);
    setForm({
      slug: route.slug,
      allowedTypes: route.allowedTypes,
      maxFileSizeMB: String(route.maxFileSize / 1024 / 1024),
      maxFileCount: String(route.maxFileCount),
      webhookUrl: route.webhookUrl ?? '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const toggleMimeType = (mimeType: string) => {
    setForm((prev) => ({
      ...prev,
      allowedTypes: prev.allowedTypes.includes(mimeType)
        ? prev.allowedTypes.filter((t) => t !== mimeType)
        : [...prev.allowedTypes, mimeType],
    }));
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.slug.trim()) {
      setFormError('Route slug is required.');
      return;
    }

    const maxFileSizeBytes = Math.round(parseFloat(form.maxFileSizeMB) * 1024 * 1024);
    const maxFileCount = parseInt(form.maxFileCount, 10);

    if (isNaN(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
      setFormError('Max file size must be a positive number.');
      return;
    }
    if (isNaN(maxFileCount) || maxFileCount <= 0) {
      setFormError('Max file count must be a positive integer.');
      return;
    }

    const payload: Record<string, unknown> = {
      slug: form.slug.trim(),
      allowedTypes: form.allowedTypes,
      maxFileSize: maxFileSizeBytes,
      maxFileCount,
      ...(form.webhookUrl ? { webhookUrl: form.webhookUrl } : {}),
    };

    if (editingRoute) {
      payload['_id'] = editingRoute._id;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/internal/projects/${slug}/routes`, {
        method: editingRoute ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setFormError(err.error ?? 'Something went wrong.');
        return;
      }

      await mutate();
      setDialogOpen(false);
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    try {
      const res = await fetch(`/api/internal/projects/${slug}/routes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: routeId }),
      });
      if (res.ok) {
        await mutate();
      }
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Route
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Edit Route' : 'Create Route'}</DialogTitle>
            <DialogDescription>
              Configure an upload route for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="route-slug" className="text-sm font-medium">
                Route slug <span className="text-destructive">*</span>
              </label>
              <Input
                id="route-slug"
                placeholder="e.g. avatarUploader"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>

            {/* Allowed types */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Allowed types</p>
              <div className="flex flex-wrap gap-1.5 rounded-md border p-2.5">
                {COMMON_MIME_TYPES.map(({ label, value }) => {
                  const selected = form.allowedTypes.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleMimeType(value)}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.allowedTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No restriction — all file types allowed.
                </p>
              )}
            </div>

            {/* Max file size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="max-size" className="text-sm font-medium">
                  Max size (MB)
                </label>
                <Input
                  id="max-size"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.maxFileSizeMB}
                  onChange={(e) => setForm((p) => ({ ...p, maxFileSizeMB: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="max-count" className="text-sm font-medium">
                  Max file count
                </label>
                <Input
                  id="max-count"
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxFileCount}
                  onChange={(e) => setForm((p) => ({ ...p, maxFileCount: e.target.value }))}
                />
              </div>
            </div>

            {/* Webhook URL (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="webhook-url" className="text-sm font-medium">
                Webhook URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-app.com/api/upload-complete"
                value={form.webhookUrl}
                onChange={(e) => setForm((p) => ({ ...p, webhookUrl: e.target.value }))}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingRoute ? 'Save changes' : 'Create route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Routes table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Allowed types</TableHead>
              <TableHead>Max size</TableHead>
              <TableHead>Max files</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={`skel-c-${j}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No routes configured. Create one to start accepting uploads.
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {route.slug}
                  </TableCell>
                  <TableCell>
                    {route.allowedTypes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">All types</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {route.allowedTypes.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatBytes(route.maxFileSize)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {route.maxFileCount}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Route actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(route)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete route &quot;{route.slug}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this route configuration.
                                Existing uploads will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleDelete(route._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
