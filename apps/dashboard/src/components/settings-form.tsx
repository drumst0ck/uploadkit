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
  Button,
} from '@uploadkitdev/ui';

interface NotificationPrefs {
  emailUsageAlerts: boolean;
  emailProductUpdates: boolean;
}

interface SettingsFormProps {
  initialName: string;
  email: string;
  initialNotifications: NotificationPrefs;
}

export function SettingsForm({ initialName, email, initialNotifications }: SettingsFormProps) {
  const router = useRouter();

  // Profile form state
  const [name, setName] = React.useState(initialName);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Delete account state
  const [confirmEmail, setConfirmEmail] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  // Notification preferences — persisted via PUT /api/internal/settings
  const [emailUsageAlerts, setEmailUsageAlerts] = React.useState(
    initialNotifications.emailUsageAlerts,
  );
  const [emailProductUpdates, setEmailProductUpdates] = React.useState(
    initialNotifications.emailProductUpdates,
  );
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const savedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  async function saveNotifications(next: Partial<NotificationPrefs>) {
    setNotifStatus('saving');
    try {
      const res = await fetch('/api/internal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: next }),
      });
      if (!res.ok) {
        setNotifStatus('error');
        return;
      }
      setNotifStatus('saved');
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setNotifStatus('idle'), 2000);
    } catch {
      setNotifStatus('error');
    }
  }

  function handleToggleUsageAlerts(checked: boolean) {
    setEmailUsageAlerts(checked);
    void saveNotifications({ emailUsageAlerts: checked });
  }

  function handleToggleProductUpdates(checked: boolean) {
    setEmailProductUpdates(checked);
    void saveNotifications({ emailProductUpdates: checked });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/internal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSaveError(data.error ?? 'Failed to save changes.');
        return;
      }

      setSaveSuccess(true);
      router.refresh();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/internal/settings', { method: 'DELETE' });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? 'Failed to delete account.');
        setIsDeleting(false);
        return;
      }

      // Redirect to login after successful deletion
      router.push('/login');
    } catch {
      setDeleteError('Network error. Please try again.');
      setIsDeleting(false);
    }
  }

  const canConfirmDelete = confirmEmail.trim() === email;

  return (
    <div className="flex flex-col gap-8">
      {/* Profile section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-medium text-foreground">Profile</h2>

        <form onSubmit={(e) => { void handleSaveProfile(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveSuccess(false);
              }}
              maxLength={100}
              placeholder="Your name"
              className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {email}
              <span className="ml-2 text-xs text-muted-foreground">(cannot be changed)</span>
            </p>
          </div>

          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-xs text-emerald-400">Changes saved successfully.</p>
          )}

          <div className="flex">
            <Button type="submit" disabled={isSaving || name.trim().length === 0}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Notifications section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Notifications</h2>
          {notifStatus === 'saving' && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {notifStatus === 'saved' && (
            <span className="text-xs text-emerald-400">Saved</span>
          )}
          {notifStatus === 'error' && (
            <span className="text-xs text-red-400">Failed to save</span>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={emailUsageAlerts}
              onChange={(e) => handleToggleUsageAlerts(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border bg-accent accent-indigo-500"
            />
            <div>
              <p className="text-sm text-foreground">Usage alerts</p>
              <p className="text-xs text-muted-foreground">
                Email me when storage or bandwidth approaches tier limits.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={emailProductUpdates}
              onChange={(e) => handleToggleProductUpdates(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border bg-accent accent-indigo-500"
            />
            <div>
              <p className="text-sm text-foreground">Product updates</p>
              <p className="text-xs text-muted-foreground">
                Email me about new features and platform updates.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Danger zone — DASH-10 */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6">
        <h2 className="mb-2 text-sm font-medium text-red-400">Danger Zone</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Permanently delete your account, all projects, files, and API keys. This action
          cannot be undone.
        </p>

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setConfirmEmail('');
              setDeleteError('');
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
              Delete Account
            </button>
          </AlertDialogTrigger>

          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Delete account permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete your account, all projects, files, and API keys.
                This action{' '}
                <span className="font-medium text-foreground">cannot be undone</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Typed email confirmation — T-06-15 repudiation mitigation */}
            <div className="flex flex-col gap-2 py-2">
              <label className="text-xs font-medium text-muted-foreground">
                Type your email address to confirm:{' '}
                <span className="font-mono text-foreground">{email}</span>
              </label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={email}
                autoComplete="off"
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors"
              />
              {deleteError && (
                <p className="text-xs text-red-400">{deleteError}</p>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="border-border bg-accent text-foreground hover:bg-accent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!canConfirmDelete || isDeleting}
                onClick={() => { void handleDeleteAccount(); }}
                className="bg-red-600 text-foreground hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
