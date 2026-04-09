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
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uploadkitdev/ui';
import { Copy, Plus, Check } from 'lucide-react';
import { fetcher } from '../lib/fetcher';
import { formatDate } from '../lib/format';

interface ApiKeyRecord {
  _id: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: string;
  createdAt: string;
}

interface NewKeyResult {
  _id: string;
  keyPrefix: string;
  name: string;
  createdAt: string;
  fullKey: string;
}

interface ApiKeysTableProps {
  slug: string;
}

export function ApiKeysTable({ slug }: ApiKeysTableProps) {
  const { data: keys = [], isLoading, mutate } = useSWR<ApiKeyRecord[]>(
    `/api/internal/projects/${slug}/keys`,
    fetcher,
  );

  // Create key dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [newKeyResult, setNewKeyResult] = React.useState<NewKeyResult | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/internal/projects/${slug}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      if (res.ok) {
        const data = (await res.json()) as NewKeyResult;
        setNewKeyResult(data);
        await mutate();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewKeyName('');
    setNewKeyResult(null);
    setCopied(false);
  };

  const handleRevoke = async (keyId: string) => {
    try {
      const res = await fetch(`/api/internal/projects/${slug}/keys`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give this key a name to identify it later.
              </DialogDescription>
            </DialogHeader>

            {newKeyResult ? (
              <div className="space-y-4">
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                  <p className="font-medium">Save this key — it will only be shown once.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Once you close this dialog, you won&apos;t be able to see the full key again.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <code className="flex-1 truncate text-xs font-mono">
                    {newKeyResult.fullKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleCopyKey(newKeyResult.fullKey)}
                    aria-label="Copy API key"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreate}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="key-name" className="text-sm font-medium">
                    Key name <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production, Staging"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate();
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreate}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={isCreating}>
                    {isCreating ? 'Creating…' : 'Create key'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={`skel-cell-${j}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No API keys yet. Create one to start using the SDK.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key._id}>
                  <TableCell className="font-medium">
                    {key.name || 'Untitled'}
                  </TableCell>
                  <TableCell>
                    {/* T-06-09: Display masked key — prefix + ellipsis */}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {key.keyPrefix}...
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          navigator.clipboard.writeText(key.keyPrefix + '...').catch(() => undefined)
                        }
                        aria-label="Copy key prefix"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                          >
                            Revoke
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Any applications using this key will stop working immediately.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void handleRevoke(key._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
